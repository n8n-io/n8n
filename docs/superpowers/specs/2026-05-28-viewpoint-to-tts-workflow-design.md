# Viewpoint-To-TTS Video Workflow Design

## Goal

Upgrade the existing `MVP - TTS Video Clip Composer` workflow so users no longer upload a TTS script file. Instead, users upload the visual assets, enter their viewpoint about a topic, choose a script mode and official Doubao voice presets, then receive a generated short-video script, TTS audio, subtitles, and the final edited video.

The existing video composition behavior remains unchanged:

- Background video plays throughout the rendered video.
- Cover image is centered in the opening stage.
- Uploaded screenshot is centered in the second stage.
- Cover and screenshot move to the top-left and top-right during the body stage.
- The final video duration is determined by the final merged TTS audio duration.
- Final output exposes previewable TTS audio and final MP4 binary data in n8n.

## Non-Goals

- No AI-generated video frames.
- No user script upload in the new MVP path.
- No manual script review step before TTS.
- No more than two dialogue voices.
- No arbitrary user-entered voice IDs.
- No global Codex skill installation requirement at runtime.
- No fact-checking or external citation pipeline for generated scripts.

## User Inputs

The n8n form should collect:

- `cover_image`: required image upload.
- `proof_screenshot`: required image upload.
- `background_video`: required video upload.
- `viewpoint`: required long text field describing the user's opinion or angle.
- `script_mode`: dropdown, default `single`, values `single` or `dialogue`.
- `voice_single`: dropdown official Doubao voice preset for single narration.
- `voice_a`: dropdown official Doubao voice preset for dialogue role A.
- `voice_b`: dropdown official Doubao voice preset for dialogue role B.
- `script_style`: dropdown, default `short_video_commentary`.

Suggested `script_style` values:

- `short_video_commentary`: short-video viewpoint narration.
- `knowledge_explainer`: explanatory/educational tone.
- `sharp_commentary`: sharper commentary tone.
- `warm_storytelling`: warmer narrative tone.

The form can display all voice fields in MVP. The workflow decides which fields are used according to `script_mode`.

## Official Voice Preset Policy

Voice selection must be a whitelist of official Doubao/Volcengine voice types from the official voice list:

https://www.volcengine.com/docs/6561/97465?lang=zh

Rules:

- Only official voice types are allowed.
- Prefer Chinese voices whose official list marks timestamp support.
- Do not accept arbitrary voice IDs in the form.
- If a preset key is unknown, fail before calling TTS.
- `.env.video-clip` may still provide `DOUBAO_TTS_VOICE` as a fallback only.

Conservative MVP preset set:

| Preset | Official voice type | Intended use |
| --- | --- | --- |
| `cancan_v2` | `BV700_V2_streaming` | general expressive female voice |
| `qingcang_v2` | `BV701_V2_streaming` | narration/explainer male voice |
| `female_general_v2` | `BV001_V2_streaming` | general female voice |
| `cancan` | `BV700_streaming` | general expressive voice |
| `qingcang` | `BV701_streaming` | narration voice |
| `male_general` | `BV002_streaming` | general male voice |

The implementation may include more official timestamp-capable presets, but should keep the MVP list small enough to reduce authorization and resource compatibility issues.

## Script Writing Skill Module

Add a project-local script writing skill/prompt source:

`tools/video-composer/script-writer/SKILL.md`

This is not installed as a global Codex skill. It is a versioned prompt/rules file read by the n8n workflow when constructing the Doubao LLM request.

Responsibilities:

- Expand a user's viewpoint into a Chinese short-video TTS script.
- Produce text suitable for direct speech synthesis.
- Control rhythm, segment length, role count, and output structure.
- Avoid Markdown, stage directions, and explanatory wrapper text.
- Return strict JSON only.

The skill should define:

- Purpose.
- Accepted inputs: `viewpoint`, `mode`, `style`, `targetLength`, optional `audience` and `tone`.
- Writing rules for short-video speech.
- Single narration rules.
- Two-person dialogue rules.
- JSON output schema.
- One single-mode example and one dialogue-mode example.

## Generated Script Schema

The LLM must return strict JSON with this shape:

```json
{
  "mode": "single",
  "title": "视频标题",
  "summary": "一句话摘要",
  "segments": [
    {
      "role": "narrator",
      "text": "适合直接朗读的一段内容。"
    }
  ]
}
```

Dialogue mode:

```json
{
  "mode": "dialogue",
  "title": "视频标题",
  "summary": "一句话摘要",
  "segments": [
    {
      "role": "A",
      "text": "A 的观点。"
    },
    {
      "role": "B",
      "text": "B 的回应。"
    }
  ]
}
```

Validation rules:

- `mode` must match the submitted `script_mode`.
- `segments` must be a non-empty array.
- `single` mode allows only `role=narrator`.
- `dialogue` mode allows only `role=A` and `role=B`.
- Dialogue mode supports two voices only.
- Segment text must be non-empty after trimming.
- Dialogue mode must have at most 12 segments.
- Recommended dialogue segment length is 20-80 Chinese characters.
- Recommended single narration total length is 350-800 Chinese characters.

## Workflow Architecture

The workflow stays as one importable n8n workflow.

1. `Upload Assets And Viewpoint`
   - Replaces the old upload form.
   - Collects visual assets, viewpoint, mode, voices, and style.

2. `Prepare Job`
   - Creates `jobId`, `jobDir`, `inputsDir`, `ttsDir`, `renderDir`, and `tts/segments`.

3. `Save Uploaded Files`
   - Saves cover, screenshot, and background video.
   - Emits normalized viewpoint, script mode, style, and selected voice preset keys.
   - Does not expect or preserve a script upload binary.

4. `Prepare Script Prompt`
   - Reads `tools/video-composer/script-writer/SKILL.md`.
   - Builds the Doubao LLM prompt using viewpoint, mode, style, and length constraints.
   - Requires strict JSON output.

5. `Doubao Script Generation Request`
   - Calls Doubao/Volcengine LLM.
   - Uses `.env.video-clip` values such as:
     - `DOUBAO_LLM_URL`
     - `DOUBAO_LLM_API_KEY`
     - `DOUBAO_LLM_MODEL`
     - `DOUBAO_LLM_TEMPERATURE`

6. `Parse Generated Script`
   - Extracts JSON from the model response.
   - Validates schema and mode constraints.
   - Writes:
     - `inputs/generated-script.json`
     - `inputs/script.txt`
   - Emits:
     - `generatedScriptText`
     - `generatedScriptTitle`
     - `generatedScriptSummary`
     - `ttsSegments`

7. `Build TTS Segment Requests`
   - Converts generated script segments into TTS request items.
   - Single mode may merge all narrator text into one request.
   - Dialogue mode creates one request per segment.
   - Resolves official voice preset keys to speaker IDs.

8. `Doubao TTS Segment Request`
   - Calls Doubao TTS per segment.
   - Uses `enable_subtitle=true` and `enable_timestamp=true`.
   - Uses the resolved official speaker ID.

9. `Save TTS Segment`
   - Saves each segment audio and timing payload.
   - Example paths:
     - `tts/segments/001-A.mp3`
     - `tts/segments/001-A-timing.json`

10. `Merge TTS Segments`
    - Runs once after segment synthesis.
    - Uses `ffprobe` to calculate segment durations.
    - Uses `ffmpeg concat` to produce `tts/audio.mp3`.
    - Produces the single complete TTS track consumed by the video composer, regardless of whether the script is single narration or dialogue.
    - Adds short, consistent inter-segment spacing only when needed to avoid abrupt dialogue cuts.
    - Offsets and merges each segment's timing data into `tts/timing.json`.
    - Emits `audioPath` and `ttsTimingPath`.

11. `Build Job Config`
    - Points `scriptText` to `inputs/script.txt`.
    - Points `ttsAudio` to `tts/audio.mp3`.
    - Points `subtitleTiming` to merged `tts/timing.json`.

12. `Run Composer Script`
    - Reuses the existing composer.

13. `Verify Final Video`
    - Reuses existing binary preview behavior.
    - Adds generated script metadata to output JSON.

14. `Respond With Result`
    - Returns:
      - final video path
      - TTS audio path
      - generated title
      - generated summary
      - generated script text
      - selected mode and voice preset keys
    - Keeps `finalVideo` and `ttsAudio` binary preview outputs.

## TTS Strategy

Do not attempt multi-role dialogue inside one TTS request.

Rationale:

- Standard Doubao TTS V3 requests use one `req_params.speaker`.
- `mix_speaker` is an official mixed-voice feature, but it blends voices into one voice and is not role-based dialogue.
- `mix_speaker` has model limitations and is not the right primitive for A/B conversational turns.

Use this strategy instead:

- Single mode: merge narrator text and synthesize once.
- Dialogue mode: synthesize one segment at a time with the role's selected speaker.
- Merge segment MP3s locally with FFmpeg into one complete `tts/audio.mp3`.
- Merge timing metadata by adding cumulative segment offsets.
- After merge, downstream video composition treats all modes identically: it receives one audio file and one timing file.

The final output must not expose a collection of separate voice clips as the primary result. Segment audio files are intermediate artifacts only. The user-facing TTS result is always one complete, continuous audio track.

Dialogue joins should feel natural. The merge step should avoid hard cuts by applying a small configurable pause between dialogue turns, for example 120-250 ms, unless tests show the provider already includes enough trailing silence. This pause must also be included in the timing offset calculation so subtitles remain aligned.

## Video Duration

The rendered video duration is determined by the final merged TTS audio duration.

Rules:

- The composer reads `tts/audio.mp3` with `ffprobe`.
- If TTS audio is longer than the visual intro stages, the body stage fills the remaining duration.
- If TTS audio is shorter than the visual intro stages, the current intro-preserving behavior may keep the minimum visual intro duration.
- For normal generated scripts, the script writer should target enough spoken text so the final TTS duration is longer than the visual intro.
- Background video loops or trims as needed to cover the final duration.

## Timing Merge

For each TTS segment:

1. Save raw response frames.
2. Extract word/sentence timing.
3. Read the segment audio duration with `ffprobe`.
4. Add the cumulative offset to every timing event.
5. Append shifted timing events into the final `tts/timing.json`.

If a segment has no usable timing:

- Mark that segment as missing timing.
- Continue audio merge.
- Let the composer fall back to duration-based subtitle splitting if no usable final timing exists.

## Error Handling

- Missing Doubao LLM config: fail before the LLM request.
- LLM non-JSON response: fail in `Parse Generated Script` and save raw response path.
- Generated script schema invalid: fail with the first validation error.
- Unknown voice preset: fail before TTS.
- Segment TTS failure: fail with `segmentIndex`, `role`, `speaker`, and a text preview.
- Empty TTS audio: fail immediately.
- FFmpeg concat failure: save and expose concat file path and FFmpeg log.
- Missing timing: do not fail unless every segment has no usable timing and strict timing is later required.

## Testing

Focused tests should cover:

- Voice preset whitelist resolution.
- LLM response JSON extraction and validation.
- Single-mode segment merging.
- Dialogue-mode segment request building.
- Timing offset merge across multiple segments, including inserted dialogue pauses.
- FFmpeg concat argument generation.
- Composer compatibility with merged `audio.mp3` and `timing.json`.
- Final video duration follows the merged TTS duration.

Smoke validation:

- Generate a single narration video from a viewpoint.
- Generate a two-voice dialogue video from the same viewpoint.
- Confirm final video contains previewable `ttsAudio` and `finalVideo` binary outputs.
- Confirm subtitles align with role-segment audio offsets.
