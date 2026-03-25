import { BaseDocumentTransformer, Document } from "@langchain/core/documents";
import { getEncoding } from "@langchain/core/utils/tiktoken";

//#region src/text_splitter.ts
var TextSplitter = class extends BaseDocumentTransformer {
	lc_namespace = [
		"langchain",
		"document_transformers",
		"text_splitters"
	];
	chunkSize = 1e3;
	chunkOverlap = 200;
	keepSeparator = false;
	lengthFunction;
	constructor(fields) {
		super(fields);
		this.chunkSize = fields?.chunkSize ?? this.chunkSize;
		this.chunkOverlap = fields?.chunkOverlap ?? this.chunkOverlap;
		this.keepSeparator = fields?.keepSeparator ?? this.keepSeparator;
		this.lengthFunction = fields?.lengthFunction ?? ((text) => text.length);
		if (this.chunkOverlap >= this.chunkSize) throw new Error("Cannot have chunkOverlap >= chunkSize");
	}
	async transformDocuments(documents, chunkHeaderOptions = {}) {
		return this.splitDocuments(documents, chunkHeaderOptions);
	}
	splitOnSeparator(text, separator) {
		let splits;
		if (separator) if (this.keepSeparator) {
			const regexEscapedSeparator = separator.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&");
			splits = text.split(/* @__PURE__ */ new RegExp(`(?=${regexEscapedSeparator})`));
		} else splits = text.split(separator);
		else splits = text.split("");
		return splits.filter((s) => s !== "");
	}
	async createDocuments(texts, metadatas = [], chunkHeaderOptions = {}) {
		const _metadatas = metadatas.length > 0 ? metadatas : [...Array(texts.length)].map(() => ({}));
		const { chunkHeader = "", chunkOverlapHeader = "(cont'd) ", appendChunkOverlapHeader = false } = chunkHeaderOptions;
		const documents = new Array();
		for (let i = 0; i < texts.length; i += 1) {
			const text = texts[i];
			let lineCounterIndex = 1;
			let prevChunk = null;
			let indexPrevChunk = -1;
			for (const chunk of await this.splitText(text)) {
				let pageContent = chunkHeader;
				const indexChunk = text.indexOf(chunk, indexPrevChunk + 1);
				if (prevChunk === null) {
					const newLinesBeforeFirstChunk = this.numberOfNewLines(text, 0, indexChunk);
					lineCounterIndex += newLinesBeforeFirstChunk;
				} else {
					const indexEndPrevChunk = indexPrevChunk + await this.lengthFunction(prevChunk);
					if (indexEndPrevChunk < indexChunk) {
						const numberOfIntermediateNewLines = this.numberOfNewLines(text, indexEndPrevChunk, indexChunk);
						lineCounterIndex += numberOfIntermediateNewLines;
					} else if (indexEndPrevChunk > indexChunk) {
						const numberOfIntermediateNewLines = this.numberOfNewLines(text, indexChunk, indexEndPrevChunk);
						lineCounterIndex -= numberOfIntermediateNewLines;
					}
					if (appendChunkOverlapHeader) pageContent += chunkOverlapHeader;
				}
				const newLinesCount = this.numberOfNewLines(chunk);
				const loc = _metadatas[i].loc && typeof _metadatas[i].loc === "object" ? { ..._metadatas[i].loc } : {};
				loc.lines = {
					from: lineCounterIndex,
					to: lineCounterIndex + newLinesCount
				};
				const metadataWithLinesNumber = {
					..._metadatas[i],
					loc
				};
				pageContent += chunk;
				documents.push(new Document({
					pageContent,
					metadata: metadataWithLinesNumber
				}));
				lineCounterIndex += newLinesCount;
				prevChunk = chunk;
				indexPrevChunk = indexChunk;
			}
		}
		return documents;
	}
	numberOfNewLines(text, start, end) {
		const textSection = text.slice(start, end);
		return (textSection.match(/\n/g) || []).length;
	}
	async splitDocuments(documents, chunkHeaderOptions = {}) {
		const selectedDocuments = documents.filter((doc) => doc.pageContent !== void 0);
		const texts = selectedDocuments.map((doc) => doc.pageContent);
		const metadatas = selectedDocuments.map((doc) => doc.metadata);
		return this.createDocuments(texts, metadatas, chunkHeaderOptions);
	}
	joinDocs(docs, separator) {
		const text = docs.join(separator).trim();
		return text === "" ? null : text;
	}
	async mergeSplits(splits, separator) {
		const docs = [];
		const currentDoc = [];
		let total = 0;
		for (const d of splits) {
			const _len = await this.lengthFunction(d);
			if (total + _len + currentDoc.length * separator.length > this.chunkSize) {
				if (total > this.chunkSize) console.warn(`Created a chunk of size ${total}, +
which is longer than the specified ${this.chunkSize}`);
				if (currentDoc.length > 0) {
					const doc$1 = this.joinDocs(currentDoc, separator);
					if (doc$1 !== null) docs.push(doc$1);
					while (total > this.chunkOverlap || total + _len + currentDoc.length * separator.length > this.chunkSize && total > 0) {
						total -= await this.lengthFunction(currentDoc[0]);
						currentDoc.shift();
					}
				}
			}
			currentDoc.push(d);
			total += _len;
		}
		const doc = this.joinDocs(currentDoc, separator);
		if (doc !== null) docs.push(doc);
		return docs;
	}
};
var CharacterTextSplitter = class extends TextSplitter {
	static lc_name() {
		return "CharacterTextSplitter";
	}
	separator = "\n\n";
	constructor(fields) {
		super(fields);
		this.separator = fields?.separator ?? this.separator;
	}
	async splitText(text) {
		const splits = this.splitOnSeparator(text, this.separator);
		return this.mergeSplits(splits, this.keepSeparator ? "" : this.separator);
	}
};
const SupportedTextSplitterLanguages = [
	"cpp",
	"go",
	"java",
	"js",
	"php",
	"proto",
	"python",
	"rst",
	"ruby",
	"rust",
	"scala",
	"swift",
	"markdown",
	"latex",
	"html",
	"sol"
];
var RecursiveCharacterTextSplitter = class RecursiveCharacterTextSplitter extends TextSplitter {
	static lc_name() {
		return "RecursiveCharacterTextSplitter";
	}
	separators = [
		"\n\n",
		"\n",
		" ",
		""
	];
	constructor(fields) {
		super(fields);
		this.separators = fields?.separators ?? this.separators;
		this.keepSeparator = fields?.keepSeparator ?? true;
	}
	async _splitText(text, separators) {
		const finalChunks = [];
		let separator = separators[separators.length - 1];
		let newSeparators;
		for (let i = 0; i < separators.length; i += 1) {
			const s = separators[i];
			if (s === "") {
				separator = s;
				break;
			}
			if (text.includes(s)) {
				separator = s;
				newSeparators = separators.slice(i + 1);
				break;
			}
		}
		const splits = this.splitOnSeparator(text, separator);
		let goodSplits = [];
		const _separator = this.keepSeparator ? "" : separator;
		for (const s of splits) if (await this.lengthFunction(s) < this.chunkSize) goodSplits.push(s);
		else {
			if (goodSplits.length) {
				const mergedText = await this.mergeSplits(goodSplits, _separator);
				finalChunks.push(...mergedText);
				goodSplits = [];
			}
			if (!newSeparators) finalChunks.push(s);
			else {
				const otherInfo = await this._splitText(s, newSeparators);
				finalChunks.push(...otherInfo);
			}
		}
		if (goodSplits.length) {
			const mergedText = await this.mergeSplits(goodSplits, _separator);
			finalChunks.push(...mergedText);
		}
		return finalChunks;
	}
	async splitText(text) {
		return this._splitText(text, this.separators);
	}
	static fromLanguage(language, options) {
		return new RecursiveCharacterTextSplitter({
			...options,
			separators: RecursiveCharacterTextSplitter.getSeparatorsForLanguage(language)
		});
	}
	static getSeparatorsForLanguage(language) {
		if (language === "cpp") return [
			"\nclass ",
			"\nvoid ",
			"\nint ",
			"\nfloat ",
			"\ndouble ",
			"\nif ",
			"\nfor ",
			"\nwhile ",
			"\nswitch ",
			"\ncase ",
			"\n\n",
			"\n",
			" ",
			""
		];
		else if (language === "go") return [
			"\nfunc ",
			"\nvar ",
			"\nconst ",
			"\ntype ",
			"\nif ",
			"\nfor ",
			"\nswitch ",
			"\ncase ",
			"\n\n",
			"\n",
			" ",
			""
		];
		else if (language === "java") return [
			"\nclass ",
			"\npublic ",
			"\nprotected ",
			"\nprivate ",
			"\nstatic ",
			"\nif ",
			"\nfor ",
			"\nwhile ",
			"\nswitch ",
			"\ncase ",
			"\n\n",
			"\n",
			" ",
			""
		];
		else if (language === "js") return [
			"\nfunction ",
			"\nconst ",
			"\nlet ",
			"\nvar ",
			"\nclass ",
			"\nif ",
			"\nfor ",
			"\nwhile ",
			"\nswitch ",
			"\ncase ",
			"\ndefault ",
			"\n\n",
			"\n",
			" ",
			""
		];
		else if (language === "php") return [
			"\nfunction ",
			"\nclass ",
			"\nif ",
			"\nforeach ",
			"\nwhile ",
			"\ndo ",
			"\nswitch ",
			"\ncase ",
			"\n\n",
			"\n",
			" ",
			""
		];
		else if (language === "proto") return [
			"\nmessage ",
			"\nservice ",
			"\nenum ",
			"\noption ",
			"\nimport ",
			"\nsyntax ",
			"\n\n",
			"\n",
			" ",
			""
		];
		else if (language === "python") return [
			"\nclass ",
			"\ndef ",
			"\n	def ",
			"\n\n",
			"\n",
			" ",
			""
		];
		else if (language === "rst") return [
			"\n===\n",
			"\n---\n",
			"\n***\n",
			"\n.. ",
			"\n\n",
			"\n",
			" ",
			""
		];
		else if (language === "ruby") return [
			"\ndef ",
			"\nclass ",
			"\nif ",
			"\nunless ",
			"\nwhile ",
			"\nfor ",
			"\ndo ",
			"\nbegin ",
			"\nrescue ",
			"\n\n",
			"\n",
			" ",
			""
		];
		else if (language === "rust") return [
			"\nfn ",
			"\nconst ",
			"\nlet ",
			"\nif ",
			"\nwhile ",
			"\nfor ",
			"\nloop ",
			"\nmatch ",
			"\nconst ",
			"\n\n",
			"\n",
			" ",
			""
		];
		else if (language === "scala") return [
			"\nclass ",
			"\nobject ",
			"\ndef ",
			"\nval ",
			"\nvar ",
			"\nif ",
			"\nfor ",
			"\nwhile ",
			"\nmatch ",
			"\ncase ",
			"\n\n",
			"\n",
			" ",
			""
		];
		else if (language === "swift") return [
			"\nfunc ",
			"\nclass ",
			"\nstruct ",
			"\nenum ",
			"\nif ",
			"\nfor ",
			"\nwhile ",
			"\ndo ",
			"\nswitch ",
			"\ncase ",
			"\n\n",
			"\n",
			" ",
			""
		];
		else if (language === "markdown") return [
			"\n## ",
			"\n### ",
			"\n#### ",
			"\n##### ",
			"\n###### ",
			"```\n\n",
			"\n\n***\n\n",
			"\n\n---\n\n",
			"\n\n___\n\n",
			"\n\n",
			"\n",
			" ",
			""
		];
		else if (language === "latex") return [
			"\n\\chapter{",
			"\n\\section{",
			"\n\\subsection{",
			"\n\\subsubsection{",
			"\n\\begin{enumerate}",
			"\n\\begin{itemize}",
			"\n\\begin{description}",
			"\n\\begin{list}",
			"\n\\begin{quote}",
			"\n\\begin{quotation}",
			"\n\\begin{verse}",
			"\n\\begin{verbatim}",
			"\n\\begin{align}",
			"$$",
			"$",
			"\n\n",
			"\n",
			" ",
			""
		];
		else if (language === "html") return [
			"<body>",
			"<div>",
			"<p>",
			"<br>",
			"<li>",
			"<h1>",
			"<h2>",
			"<h3>",
			"<h4>",
			"<h5>",
			"<h6>",
			"<span>",
			"<table>",
			"<tr>",
			"<td>",
			"<th>",
			"<ul>",
			"<ol>",
			"<header>",
			"<footer>",
			"<nav>",
			"<head>",
			"<style>",
			"<script>",
			"<meta>",
			"<title>",
			" ",
			""
		];
		else if (language === "sol") return [
			"\npragma ",
			"\nusing ",
			"\ncontract ",
			"\ninterface ",
			"\nlibrary ",
			"\nconstructor ",
			"\ntype ",
			"\nfunction ",
			"\nevent ",
			"\nmodifier ",
			"\nerror ",
			"\nstruct ",
			"\nenum ",
			"\nif ",
			"\nfor ",
			"\nwhile ",
			"\ndo while ",
			"\nassembly ",
			"\n\n",
			"\n",
			" ",
			""
		];
		else throw new Error(`Language ${language} is not supported.`);
	}
};
/**
* Implementation of splitter which looks at tokens.
*/
var TokenTextSplitter = class extends TextSplitter {
	static lc_name() {
		return "TokenTextSplitter";
	}
	encodingName;
	allowedSpecial;
	disallowedSpecial;
	tokenizer;
	constructor(fields) {
		super(fields);
		this.encodingName = fields?.encodingName ?? "gpt2";
		this.allowedSpecial = fields?.allowedSpecial ?? [];
		this.disallowedSpecial = fields?.disallowedSpecial ?? "all";
	}
	async splitText(text) {
		if (!this.tokenizer) this.tokenizer = await getEncoding(this.encodingName);
		const splits = [];
		const input_ids = this.tokenizer.encode(text, this.allowedSpecial, this.disallowedSpecial);
		let start_idx = 0;
		while (start_idx < input_ids.length) {
			if (start_idx > 0) start_idx -= this.chunkOverlap;
			const end_idx = Math.min(start_idx + this.chunkSize, input_ids.length);
			const chunk_ids = input_ids.slice(start_idx, end_idx);
			splits.push(this.tokenizer.decode(chunk_ids));
			start_idx = end_idx;
		}
		return splits;
	}
};
var MarkdownTextSplitter = class extends RecursiveCharacterTextSplitter {
	constructor(fields) {
		super({
			...fields,
			separators: RecursiveCharacterTextSplitter.getSeparatorsForLanguage("markdown")
		});
	}
};
var LatexTextSplitter = class extends RecursiveCharacterTextSplitter {
	constructor(fields) {
		super({
			...fields,
			separators: RecursiveCharacterTextSplitter.getSeparatorsForLanguage("latex")
		});
	}
};

//#endregion
export { CharacterTextSplitter, LatexTextSplitter, MarkdownTextSplitter, RecursiveCharacterTextSplitter, SupportedTextSplitterLanguages, TextSplitter, TokenTextSplitter };
//# sourceMappingURL=text_splitter.js.map