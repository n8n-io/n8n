#!/usr/bin/env node
/* xlsx.js (C) 2013-present  SheetJS -- http://sheetjs.com */
/* eslint-env node */
/* vim: set ts=2 ft=javascript: */
var n = "xlsx";
var X = require('../');
try { X = require('../xlsx.flow'); } catch(e) {}
try { require('exit-on-epipe'); } catch(e) {}
var fs = require('fs'), program;
try { program = require('commander'); } catch(e) {
	[
		"The `xlsx` command line tool is deprecated in favor of `xlsx-cli`.",
		"",
		"For new versions of node, we recommend using `npx`:",
		"    $ npx xlsx-cli --help",
		"",
		"For older versions of node, explicitly install `xlsx-cli` globally:",
		"    $ npm i -g xlsx-cli",
		"    $ xlsx-cli --help"
	].forEach(function(m) { console.error(m); });
	process.exit(1);
}
program
	.version(X.version)
	.usage('[options] <file> [sheetname]')
	.option('-f, --file <file>', 'use specified workbook')
	.option('-s, --sheet <sheet>', 'print specified sheet (default first sheet)')
	.option('-N, --sheet-index <idx>', 'use specified sheet index (0-based)')
	.option('-p, --password <pw>', 'if file is encrypted, try with specified pw')
	.option('-l, --list-sheets', 'list sheet names and exit')
	.option('-o, --output <file>', 'output to specified file')

	.option('-B, --xlsb', 'emit XLSB to <sheetname> or <file>.xlsb')
	.option('-M, --xlsm', 'emit XLSM to <sheetname> or <file>.xlsm')
	.option('-X, --xlsx', 'emit XLSX to <sheetname> or <file>.xlsx')
	.option('-I, --xlam', 'emit XLAM to <sheetname> or <file>.xlam')
	.option('-Y, --ods',  'emit ODS  to <sheetname> or <file>.ods')
	.option('-8, --xls',  'emit XLS  to <sheetname> or <file>.xls (BIFF8)')
	.option('-5, --biff5','emit XLS  to <sheetname> or <file>.xls (BIFF5)')
	.option('-4, --biff4','emit XLS  to <sheetname> or <file>.xls (BIFF4)')
	.option('-3, --biff3','emit XLS  to <sheetname> or <file>.xls (BIFF3)')
	.option('-2, --biff2','emit XLS  to <sheetname> or <file>.xls (BIFF2)')
	.option('-i, --xla',  'emit XLA to <sheetname> or <file>.xla')
	.option('-6, --xlml', 'emit SSML to <sheetname> or <file>.xls (2003 XML)')
	.option('-T, --fods', 'emit FODS to <sheetname> or <file>.fods (Flat ODS)')
	.option('--wk3',      'emit WK3  to <sheetname> or <file>.txt (Lotus WK3)')
	.option('--numbers',  'emit NUMBERS to <sheetname> or <file>.numbers')

	.option('-S, --formulae', 'emit list of values and formulae')
	.option('-j, --json',     'emit formatted JSON (all fields text)')
	.option('-J, --raw-js',   'emit raw JS object (raw numbers)')
	.option('-A, --arrays',   'emit rows as JS objects (raw numbers)')
	.option('-H, --html', 'emit HTML to <sheetname> or <file>.html')
	.option('-D, --dif',  'emit DIF  to <sheetname> or <file>.dif (Lotus DIF)')
	.option('-U, --dbf',  'emit DBF  to <sheetname> or <file>.dbf (MSVFP DBF)')
	.option('-K, --sylk', 'emit SYLK to <sheetname> or <file>.slk (Excel SYLK)')
	.option('-P, --prn',  'emit PRN  to <sheetname> or <file>.prn (Lotus PRN)')
	.option('-E, --eth',  'emit ETH  to <sheetname> or <file>.eth (Ethercalc)')
	.option('-t, --txt',  'emit TXT  to <sheetname> or <file>.txt (UTF-8 TSV)')
	.option('-r, --rtf',  'emit RTF  to <sheetname> or <file>.txt (Table RTF)')
	.option('--wk1',      'emit WK1  to <sheetname> or <file>.txt (Lotus WK1)')
	.option('-z, --dump', 'dump internal representation as JSON')
	.option('--props',    'dump workbook properties as CSV')

	.option('-F, --field-sep <sep>', 'CSV field separator', ",")
	.option('-R, --row-sep <sep>', 'CSV row separator', "\n")
	.option('-n, --sheet-rows <num>', 'Number of rows to process (0=all rows)')
	.option('--codepage <cp>', 'default to specified codepage when ambiguous')
	.option('--req <module>', 'require module before processing')
	.option('--sst', 'generate shared string table for XLS* formats')
	.option('--compress', 'use compression when writing XLSX/M/B and ODS')
	.option('--read', 'read but do not generate output')
	.option('--book', 'for single-sheet formats, emit a file per worksheet')
	.option('--all', 'parse everything; write as much as possible')
	.option('--dev', 'development mode')
	.option('--sparse', 'sparse mode')
	.option('-q, --quiet', 'quiet mode');

program.on('--help', function() {
	console.log('  Default output format is CSV');
	console.log('  Support email: dev@sheetjs.com');
	console.log('  Web Demo: http://oss.sheetjs.com/js-'+n+'/');
});

/* flag, bookType, default ext */
var workbook_formats = [
	['xlsx',   'xlsx', 'xlsx'],
	['xlsm',   'xlsm', 'xlsm'],
	['xlam',   'xlam', 'xlam'],
	['xlsb',   'xlsb', 'xlsb'],
	['xls',     'xls',  'xls'],
	['xla',     'xla',  'xla'],
	['biff5', 'biff5',  'xls'],
	['numbers', 'numbers', 'numbers'],
	['ods',     'ods',  'ods'],
	['fods',   'fods', 'fods'],
	['wk3',     'wk3',  'wk3']
];
var wb_formats_2 = [
	['xlml',   'xlml', 'xls']
];
program.parse(process.argv);

var filename = '', sheetname = '';
if(program.args[0]) {
	filename = program.args[0];
	if(program.args[1]) sheetname = program.args[1];
}
if(program.sheet) sheetname = program.sheet;
if(program.file) filename = program.file;

if(!filename) {
	console.error(n + ": must specify a filename");
	process.exit(1);
}
if(!fs.existsSync(filename)) {
	console.error(n + ": " + filename + ": No such file or directory");
	process.exit(2);
}

if(program.req) program.req.split(",").forEach(function(r) {
	require((fs.existsSync(r) || fs.existsSync(r + '.js')) ? require('path').resolve(r) : r);
});

var opts = {}, wb/*:?Workbook*/;
if(program.listSheets) opts.bookSheets = true;
if(program.sheetRows) opts.sheetRows = program.sheetRows;
if(program.password) opts.password = program.password;
var seen = false;
function wb_fmt() {
	seen = true;
	opts.cellFormula = true;
	opts.cellNF = true;
	opts.xlfn = true;
	if(program.output) sheetname = program.output;
}
function isfmt(m/*:string*/)/*:boolean*/ {
	if(!program.output) return false;
	var t = m.charAt(0) === "." ? m : "." + m;
	return program.output.slice(-t.length) === t;
}
workbook_formats.forEach(function(m) { if(program[m[0]] || isfmt(m[0])) { wb_fmt(); } });
wb_formats_2.forEach(function(m) { if(program[m[0]] || isfmt(m[0])) { wb_fmt(); } });
if(seen) {
} else if(program.formulae) opts.cellFormula = true;
else opts.cellFormula = false;

var wopts = ({WTF:opts.WTF, bookSST:program.sst}/*:any*/);
if(program.compress) wopts.compression = true;

if(program.all) {
	opts.cellFormula = true;
	opts.bookVBA = true;
	opts.cellNF = true;
	opts.cellHTML = true;
	opts.cellStyles = true;
	opts.sheetStubs = true;
	opts.cellDates = true;
	wopts.cellFormula = true;
	wopts.cellStyles = true;
	wopts.sheetStubs = true;
	wopts.bookVBA = true;
}
if(program.sparse) opts.dense = false; else opts.dense = true;
if(program.codepage) opts.codepage = +program.codepage;

if(program.dev) {
	opts.WTF = true;
	wb = X.readFile(filename, opts);
} else try {
	wb = X.readFile(filename, opts);
} catch(e) {
	var msg = (program.quiet) ? "" : n + ": error parsing ";
	msg += filename + ": " + e;
	console.error(msg);
	process.exit(3);
}
if(program.read) process.exit(0);
if(!wb) { console.error(n + ": error parsing " + filename + ": empty workbook"); process.exit(0); }
/*:: if(!wb) throw new Error("unreachable"); */
if(program.listSheets) {
	console.log((wb.SheetNames||[]).join("\n"));
	process.exit(0);
}
if(program.dump) {
	console.log(JSON.stringify(wb));
	process.exit(0);
}
if(program.props) {
	if(wb) dump_props(wb);
	process.exit(0);
}

/* full workbook formats */
workbook_formats.forEach(function(m) { if(program[m[0]] || isfmt(m[0])) {
		wopts.bookType = m[1];
		if(wopts.bookType == "numbers") try {
			var XLSX_ZAHL = require("../dist/xlsx.zahl");
			wopts.numbers = XLSX_ZAHL;
		} catch(e) {}
		if(wb) X.writeFile(wb, program.output || sheetname || ((filename || "") + "." + m[2]), wopts);
		process.exit(0);
} });

wb_formats_2.forEach(function(m) { if(program[m[0]] || isfmt(m[0])) {
		wopts.bookType = m[1];
		if(wb) X.writeFile(wb, program.output || sheetname || ((filename || "") + "." + m[2]), wopts);
		process.exit(0);
} });

var target_sheet = sheetname || '';
if(target_sheet === '') {
	if(+program.sheetIndex < (wb.SheetNames||[]).length) target_sheet = wb.SheetNames[+program.sheetIndex];
	else target_sheet = (wb.SheetNames||[""])[0];
}

var ws;
try {
	ws = wb.Sheets[target_sheet];
	if(!ws) {
		console.error("Sheet " + target_sheet + " cannot be found");
		process.exit(3);
	}
} catch(e) {
	console.error(n + ": error parsing "+filename+" "+target_sheet+": " + e);
	process.exit(4);
}

if(!program.quiet && !program.book) console.error(target_sheet);

/* single worksheet file formats */
[
	['biff2', '.xls'],
	['biff3', '.xls'],
	['biff4', '.xls'],
	['sylk', '.slk'],
	['html', '.html'],
	['prn', '.prn'],
	['eth', '.eth'],
	['rtf', '.rtf'],
	['txt', '.txt'],
	['dbf', '.dbf'],
	['wk1', '.wk1'],
	['dif', '.dif']
].forEach(function(m) { if(program[m[0]] || isfmt(m[1])) {
	wopts.bookType = m[0];
	if(program.book) {
		/*:: if(wb == null) throw new Error("Unreachable"); */
		wb.SheetNames.forEach(function(n, i) {
			wopts.sheet = n;
			X.writeFile(wb, (program.output || sheetname || filename || "") + m[1] + "." + i, wopts);
		});
	} else X.writeFile(wb, program.output || sheetname || ((filename || "") + m[1]), wopts);
	process.exit(0);
} });

function outit(o, fn) { if(fn) fs.writeFileSync(fn, o); else console.log(o); }

function doit(cb) {
	/*:: if(!wb) throw new Error("unreachable"); */
	if(program.book) wb.SheetNames.forEach(function(n, i) {
		/*:: if(!wb) throw new Error("unreachable"); */
		outit(cb(wb.Sheets[n]), (program.output || sheetname || filename) + "." + i);
	});
	else outit(cb(ws), program.output);
}

var jso = {};
switch(true) {
	case program.formulae:
		doit(function(ws) { return X.utils.sheet_to_formulae(ws).join("\n"); });
		break;

	case program.arrays: jso.header = 1;
	/* falls through */
	case program.rawJs: jso.raw = true;
	/* falls through */
	case program.json:
		doit(function(ws) { return JSON.stringify(X.utils.sheet_to_json(ws,jso)); });
		break;

	default:
		if(!program.book) {
			var stream = X.stream.to_csv(ws, {FS:program.fieldSep||",", RS:program.rowSep||"\n"});
			if(program.output) stream.pipe(fs.createWriteStream(program.output));
			else stream.pipe(process.stdout);
		} else doit(function(ws) { return X.utils.sheet_to_csv(ws,{FS:program.fieldSep, RS:program.rowSep}); });
		break;
}

function dump_props(wb/*:Workbook*/) {
	var propaoa = [];
	if(Object.assign && Object.entries) propaoa = Object.entries(Object.assign({}, wb.Props, wb.Custprops));
	else {
		var Keys/*:: :Array<string> = []*/, pi;
		if(wb.Props) {
			Keys = Object.keys(wb.Props);
			for(pi = 0; pi < Keys.length; ++pi) {
				if(Object.prototype.hasOwnProperty.call(Keys, Keys[pi])) propaoa.push([Keys[pi], Keys[/*::+*/Keys[pi]]]);
			}
		}
		if(wb.Custprops) {
			Keys = Object.keys(wb.Custprops);
			for(pi = 0; pi < Keys.length; ++pi) {
				if(Object.prototype.hasOwnProperty.call(Keys, Keys[pi])) propaoa.push([Keys[pi], Keys[/*::+*/Keys[pi]]]);
			}
		}
	}
	console.log(X.utils.sheet_to_csv(X.utils.aoa_to_sheet(propaoa)));
}
