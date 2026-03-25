import { __export } from "../../_virtual/rolldown_runtime.js";
import { Tool } from "@langchain/core/tools";
import { loadPyodide } from "pyodide";

//#region src/experimental/tools/pyinterpreter.ts
var pyinterpreter_exports = {};
__export(pyinterpreter_exports, { PythonInterpreterTool: () => PythonInterpreterTool });
var PythonInterpreterTool = class extends Tool {
	static lc_name() {
		return "PythonInterpreterTool";
	}
	name = "python_interpreter";
	description = `Evaluates python code in a sandbox environment. The environment resets on every execution. You must send the whole script every time and print your outputs. Script should be pure python code that can be evaluated. Packages available:
${this.availableDefaultPackages}`;
	pyodideInstance;
	stdout = "";
	stderr = "";
	constructor(options) {
		super(options);
		this.pyodideInstance = options.instance;
		this.pyodideInstance.setStderr({ batched: (text) => {
			this.stderr += text;
		} });
		this.pyodideInstance.setStdout({ batched: (text) => {
			this.stdout += text;
		} });
	}
	async addPackage(packageName) {
		await this.pyodideInstance.loadPackage(packageName);
		this.description += `, ${packageName}`;
	}
	get availableDefaultPackages() {
		return [
			"asciitree",
			"astropy",
			"atomicwrites",
			"attrs",
			"autograd",
			"awkward-cpp",
			"bcrypt",
			"beautifulsoup4",
			"biopython",
			"bitarray",
			"bitstring",
			"bleach",
			"bokeh",
			"boost-histogram",
			"brotli",
			"cachetools",
			"Cartopy",
			"cbor-diag",
			"certifi",
			"cffi",
			"cffi_example",
			"cftime",
			"click",
			"cligj",
			"cloudpickle",
			"cmyt",
			"colorspacious",
			"contourpy",
			"coolprop",
			"coverage",
			"cramjam",
			"cryptography",
			"cssselect",
			"cycler",
			"cytoolz",
			"decorator",
			"demes",
			"deprecation",
			"distlib",
			"docutils",
			"exceptiongroup",
			"fastparquet",
			"fiona",
			"fonttools",
			"freesasa",
			"fsspec",
			"future",
			"galpy",
			"gensim",
			"geopandas",
			"gmpy2",
			"gsw",
			"h5py",
			"html5lib",
			"idna",
			"igraph",
			"imageio",
			"iniconfig",
			"jedi",
			"Jinja2",
			"joblib",
			"jsonschema",
			"kiwisolver",
			"lazy-object-proxy",
			"lazy_loader",
			"lightgbm",
			"logbook",
			"lxml",
			"MarkupSafe",
			"matplotlib",
			"matplotlib-pyodide",
			"micropip",
			"mne",
			"more-itertools",
			"mpmath",
			"msgpack",
			"msprime",
			"multidict",
			"munch",
			"mypy",
			"netcdf4",
			"networkx",
			"newick",
			"nlopt",
			"nltk",
			"nose",
			"numcodecs",
			"numpy",
			"opencv-python",
			"optlang",
			"orjson",
			"packaging",
			"pandas",
			"parso",
			"patsy",
			"peewee",
			"Pillow",
			"pillow_heif",
			"pkgconfig",
			"pluggy",
			"protobuf",
			"py",
			"pyb2d",
			"pyclipper",
			"pycparser",
			"pycryptodome",
			"pydantic",
			"pyerfa",
			"Pygments",
			"pyheif",
			"pyinstrument",
			"pynacl",
			"pyodide-http",
			"pyodide-tblib",
			"pyparsing",
			"pyproj",
			"pyrsistent",
			"pyshp",
			"pytest",
			"pytest-benchmark",
			"python-dateutil",
			"python-magic",
			"python-sat",
			"python_solvespace",
			"pytz",
			"pywavelets",
			"pyxel",
			"pyyaml",
			"rebound",
			"reboundx",
			"regex",
			"retrying",
			"RobotRaconteur",
			"ruamel.yaml",
			"rust-panic-test",
			"scikit-image",
			"scikit-learn",
			"scipy",
			"screed",
			"setuptools",
			"shapely",
			"simplejson",
			"six",
			"smart_open",
			"soupsieve",
			"sourmash",
			"sparseqr",
			"sqlalchemy",
			"statsmodels",
			"svgwrite",
			"swiglpk",
			"sympy",
			"termcolor",
			"texttable",
			"threadpoolctl",
			"tomli",
			"tomli-w",
			"toolz",
			"tqdm",
			"traits",
			"tskit",
			"typing-extensions",
			"uncertainties",
			"unyt",
			"webencodings",
			"wordcloud",
			"wrapt",
			"xarray",
			"xgboost",
			"xlrd",
			"xyzservices",
			"yarl",
			"yt",
			"zarr"
		].join(", ");
	}
	static async initialize(options) {
		const instance = await loadPyodide(options);
		return new this({
			...options,
			instance
		});
	}
	async _call(script) {
		this.stdout = "";
		this.stderr = "";
		await this.pyodideInstance.runPythonAsync(script);
		return JSON.stringify({
			stdout: this.stdout,
			stderr: this.stderr
		});
	}
};

//#endregion
export { PythonInterpreterTool, pyinterpreter_exports };
//# sourceMappingURL=pyinterpreter.js.map