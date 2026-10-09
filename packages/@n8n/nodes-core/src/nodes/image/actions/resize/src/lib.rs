//! `image.resize`: resizes the image of each item and converts it, with the pure-Rust `image`
//! crate. It needs no native library, so it runs in the `wasm` runtime and needs no container.

use std::cell::Cell;
use std::io::Cursor;

use image::{imageops::FilterType, DynamicImage, ImageFormat};
use n8n_node_sdk::bindings::exports::n8n::node_contract::action::{
    Guest, GuestItemRun, Output, RoutedOutput,
};
use n8n_node_sdk::bindings::n8n::node_contract::binary::{self, BinaryWriter};
use n8n_node_sdk::{from_json, run_error, to_json, Json, RunError, Unsupported};
use serde::Deserialize;
use serde_json::json;

/// The host gives at most 4 MiB per read. 1 MiB keeps each message small.
const CHUNK: usize = 1 << 20;

#[derive(Deserialize)]
struct BinaryRef {
    #[serde(rename = "$binary")]
    id: u64,
}

#[derive(Deserialize, Clone, Copy, Default)]
#[serde(rename_all = "lowercase")]
enum Format {
    #[default]
    Png,
    Jpeg,
    Webp,
}

impl Format {
    fn name(self) -> &'static str {
        match self {
            Format::Png => "png",
            Format::Jpeg => "jpeg",
            Format::Webp => "webp",
        }
    }
}

#[derive(Deserialize)]
struct Input {
    file: BinaryRef,
    width: u32,
    height: u32,
    #[serde(default)]
    format: Format,
}

fn read_all(file: &binary::Binary) -> Result<Vec<u8>, RunError> {
    let reader = file.reader();
    let mut bytes = Vec::new();
    loop {
        let chunk = reader.read(CHUNK as u32).map_err(run_error)?;
        if chunk.is_empty() {
            return Ok(bytes);
        }
        bytes.extend(chunk);
    }
}

/// The image in the format. JPEG has no alpha channel, and the WebP encoder takes 8-bit RGBA.
fn encode(image: &DynamicImage, format: Format) -> Result<Vec<u8>, RunError> {
    let (converted, image_format) = match format {
        Format::Png => (image.clone(), ImageFormat::Png),
        Format::Jpeg => (DynamicImage::ImageRgb8(image.to_rgb8()), ImageFormat::Jpeg),
        Format::Webp => (
            DynamicImage::ImageRgba8(image.to_rgba8()),
            ImageFormat::WebP,
        ),
    };
    let mut bytes = Cursor::new(Vec::new());
    converted
        .write_to(&mut bytes, image_format)
        .map_err(|e| run_error(format!("Cannot write the image as {}: {e}", format.name())))?;
    Ok(bytes.into_inner())
}

fn resize(input: &str) -> Result<Json, RunError> {
    let input: Input = from_json(input)?;
    let file = binary::open(input.file.id).map_err(run_error)?;
    let image = image::load_from_memory(&read_all(&file)?)
        .map_err(|e| run_error(format!("Cannot read the image: {e}")))?;
    let resized = image.resize(input.width, input.height, FilterType::Lanczos3);
    let bytes = encode(&resized, input.format)?;
    let stem = file
        .meta()
        .file_name
        .and_then(|name| name.rsplit_once('.').map(|(stem, _)| stem.to_string()))
        .unwrap_or_else(|| "image".to_string());
    let format = input.format.name();
    let writer = BinaryWriter::new(
        &format!("image/{format}"),
        Some(&format!("{stem}.{format}")),
    );
    for chunk in bytes.chunks(CHUNK) {
        writer.write(chunk).map_err(run_error)?;
    }
    let stored = BinaryWriter::finish(writer).map_err(run_error)?;
    to_json(&json!({
        "data": { "$binary": stored.id() },
        "width": resized.width(),
        "height": resized.height(),
        "format": format,
    }))
}

struct ImageResize;

impl Guest for ImageResize {
    type Run = Unsupported;
    type ItemRun = ItemRun;
    type JoinRun = Unsupported;
    type ChunkRun = Unsupported;

    fn describe() -> Json {
        include_str!("../contract.json").to_string()
    }

    fn migrate(from_major: u32, _params: Json) -> Result<Json, RunError> {
        Err(run_error(format!(
            "image.resize has no major {from_major} to migrate from"
        )))
    }
}

/// A `per-item` run: one output item for the input item.
struct ItemRun {
    input: Json,
    done: Cell<bool>,
}

impl GuestItemRun for ItemRun {
    fn new(input: Json, _items: Vec<Json>) -> Self {
        Self {
            input,
            done: Cell::new(false),
        }
    }

    fn next(&self) -> Result<Option<RoutedOutput>, RunError> {
        if self.done.replace(true) {
            return Ok(None);
        }
        Ok(Some(RoutedOutput {
            to: None,
            output: Output::Item(resize(&self.input)?),
        }))
    }
}

n8n_node_sdk::export_action!(ImageResize);
