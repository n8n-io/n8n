/**
 * Elements configurable by a dataset library.
 */
export interface DatasetLibraryUiElement {
	/**
	 * Pretty name of the library.
	 * displayed (in tags?, and) on the main
	 * call-to-action button on the dataset page.
	 */
	prettyLabel: string;
	/**
	 * Repo name of the library's (usually on GitHub) code repo
	 */
	repoName: string;
	/**
	 * URL to library's (usually on GitHub) code repo
	 */
	repoUrl: string;
	/**
	 * URL to library's docs
	 */
	docsUrl?: string;
}

export const DATASET_LIBRARIES_UI_ELEMENTS = {
	mlcroissant: {
		prettyLabel: "Croissant",
		repoName: "croissant",
		repoUrl: "https://github.com/mlcommons/croissant/tree/main/python/mlcroissant",
		docsUrl: "https://huggingface.co/docs/dataset-viewer/mlcroissant",
	},
	webdataset: {
		prettyLabel: "WebDataset",
		repoName: "webdataset",
		repoUrl: "https://github.com/webdataset/webdataset",
		docsUrl: "https://huggingface.co/docs/hub/datasets-webdataset",
	},
	datasets: {
		prettyLabel: "Datasets",
		repoName: "datasets",
		repoUrl: "https://github.com/huggingface/datasets",
		docsUrl: "https://huggingface.co/docs/hub/datasets-usage",
	},
	pandas: {
		prettyLabel: "pandas",
		repoName: "pandas",
		repoUrl: "https://github.com/pandas-dev/pandas",
		docsUrl: "https://huggingface.co/docs/hub/datasets-pandas",
	},
	dask: {
		prettyLabel: "Dask",
		repoName: "dask",
		repoUrl: "https://github.com/dask/dask",
		docsUrl: "https://huggingface.co/docs/hub/datasets-dask",
	},
	distilabel: {
		prettyLabel: "Distilabel",
		repoName: "distilabel",
		repoUrl: "https://github.com/argilla-io/distilabel",
		docsUrl: "https://huggingface.co/docs/hub/datasets-distilabel",
	},
	fiftyone: {
		prettyLabel: "FiftyOne",
		repoName: "fiftyone",
		repoUrl: "https://github.com/voxel51/fiftyone",
		docsUrl: "https://huggingface.co/docs/hub/datasets-fiftyone",
	},
	argilla: {
		prettyLabel: "Argilla",
		repoName: "argilla",
		repoUrl: "https://github.com/argilla-io/argilla",
		docsUrl: "https://huggingface.co/docs/hub/datasets-argilla",
	},
	polars: {
		prettyLabel: "Polars",
		repoName: "polars",
		repoUrl: "https://github.com/pola-rs/polars",
		docsUrl: "https://huggingface.co/docs/hub/datasets-polars",
	},
	duckdb: {
		prettyLabel: "DuckDB",
		repoName: "duckdb",
		repoUrl: "https://github.com/duckdb/duckdb",
		docsUrl: "https://huggingface.co/docs/hub/datasets-duckdb",
	},
} satisfies Record<string, DatasetLibraryUiElement>;

/// List of the dataset libraries supported by the Hub
export type DatasetLibraryKey = keyof typeof DATASET_LIBRARIES_UI_ELEMENTS;
