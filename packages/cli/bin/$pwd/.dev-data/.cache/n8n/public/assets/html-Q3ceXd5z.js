//#region ../../../node_modules/.pnpm/prettier@3.6.2/node_modules/prettier/plugins/html.mjs
var on = Object.defineProperty;
var un = (t) => {
	throw TypeError(t);
};
var Ai = (t, e, r) => e in t ? on(t, e, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: r
}) : t[e] = r;
var ln = (t, e) => {
	for (var r in e) on(t, r, {
		get: e[r],
		enumerable: !0
	});
};
var lr = (t, e, r) => Ai(t, typeof e != "symbol" ? e + "" : e, r);
var cn = (t, e, r) => e.has(t) || un("Cannot " + r);
var R = (t, e, r) => (cn(t, e, "read from private field"), r ? r.call(t) : e.get(t));
var At = (t, e, r) => e.has(t) ? un("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, r);
var pn = (t, e, r, n) => (cn(t, e, "write to private field"), n ? n.call(t, r) : e.set(t, r), r);
var rn = {};
ln(rn, {
	languages: () => Hs,
	options: () => Us,
	parsers: () => tn,
	printers: () => uu
});
var Di = (t, e, r, n) => {
	if (!(t && e == null)) return e.replaceAll ? e.replaceAll(r, n) : r.global ? e.replace(r, n) : e.split(r).join(n);
};
var w = Di;
var we = "string";
var ze = "array";
var Ye = "cursor";
var be = "indent";
var Te = "align";
var je = "trim";
var xe = "group";
var ke = "fill";
var ce = "if-break";
var Be = "indent-if-break";
var Ke = "line-suffix";
var Xe = "line-suffix-boundary";
var j = "line";
var Qe = "label";
var Le = "break-parent";
var Dt = /* @__PURE__ */ new Set([
	Ye,
	be,
	Te,
	je,
	xe,
	ke,
	ce,
	Be,
	Ke,
	Xe,
	j,
	Qe,
	Le
]);
var vi = (t, e, r) => {
	if (!(t && e == null)) return Array.isArray(e) || typeof e == "string" ? e[r < 0 ? e.length + r : r] : e.at(r);
};
var K = vi;
function yi(t) {
	if (typeof t == "string") return we;
	if (Array.isArray(t)) return ze;
	if (!t) return;
	let { type: e } = t;
	if (Dt.has(e)) return e;
}
var Fe = yi;
var wi = (t) => new Intl.ListFormat("en-US", { type: "disjunction" }).format(t);
function bi(t) {
	let e = t === null ? "null" : typeof t;
	if (e !== "string" && e !== "object") return `Unexpected doc '${e}', 
Expected it to be 'string' or 'object'.`;
	if (Fe(t)) throw new Error("doc is valid.");
	let r = Object.prototype.toString.call(t);
	if (r !== "[object Object]") return `Unexpected doc '${r}'.`;
	let n = wi([...Dt].map((s) => `'${s}'`));
	return `Unexpected doc.type '${t.type}'.
Expected it to be ${n}.`;
}
var cr = class extends Error {
	name = "InvalidDocError";
	constructor(e) {
		super(bi(e)), this.doc = e;
	}
};
var pr = cr;
function hr(t, e) {
	if (typeof t == "string") return e(t);
	let r = /* @__PURE__ */ new Map();
	return n(t);
	function n(i) {
		if (r.has(i)) return r.get(i);
		let a = s(i);
		return r.set(i, a), a;
	}
	function s(i) {
		switch (Fe(i)) {
			case ze: return e(i.map(n));
			case ke: return e({
				...i,
				parts: i.parts.map(n)
			});
			case ce: return e({
				...i,
				breakContents: n(i.breakContents),
				flatContents: n(i.flatContents)
			});
			case xe: {
				let { expandedStates: a, contents: o } = i;
				return a ? (a = a.map(n), o = a[0]) : o = n(o), e({
					...i,
					contents: o,
					expandedStates: a
				});
			}
			case Te:
			case be:
			case Be:
			case Qe:
			case Ke: return e({
				...i,
				contents: n(i.contents)
			});
			case we:
			case Ye:
			case je:
			case Xe:
			case j:
			case Le: return e(i);
			default: throw new pr(i);
		}
	}
}
function B(t, e = hn) {
	return hr(t, (r) => typeof r == "string" ? H(e, r.split(`
`)) : r);
}
var mr = () => {};
var re = mr;
var fr = mr;
var mn = mr;
function k(t) {
	return re(t), {
		type: be,
		contents: t
	};
}
function fn(t, e) {
	return re(e), {
		type: Te,
		contents: e,
		n: t
	};
}
function E(t, e = {}) {
	return re(t), fr(e.expandedStates, !0), {
		type: xe,
		id: e.id,
		contents: t,
		break: !!e.shouldBreak,
		expandedStates: e.expandedStates
	};
}
function dn(t) {
	return fn(Number.NEGATIVE_INFINITY, t);
}
function gn(t) {
	return fn({ type: "root" }, t);
}
function vt(t) {
	return mn(t), {
		type: ke,
		parts: t
	};
}
function pe(t, e = "", r = {}) {
	return re(t), e !== "" && re(e), {
		type: ce,
		breakContents: t,
		flatContents: e,
		groupId: r.groupId
	};
}
function Cn(t, e) {
	return re(t), {
		type: Be,
		contents: t,
		groupId: e.groupId,
		negate: e.negate
	};
}
var ne = { type: Le };
var xi = {
	type: j,
	hard: !0
};
var ki = {
	type: j,
	hard: !0,
	literal: !0
};
var _ = { type: j };
var v = {
	type: j,
	soft: !0
};
var S = [xi, ne];
var hn = [ki, ne];
function H(t, e) {
	re(t), fr(e);
	let r = [];
	for (let n = 0; n < e.length; n++) n !== 0 && r.push(t), r.push(e[n]);
	return r;
}
var yt = "'";
var Sn = "\"";
function Bi(t, e) {
	let r = e === !0 || e === yt ? yt : Sn, n = r === yt ? Sn : yt, s = 0, i = 0;
	for (let a of t) a === r ? s++ : a === n && i++;
	return s > i ? n : r;
}
var _n = Bi;
function dr(t) {
	if (typeof t != "string") throw new TypeError("Expected a string");
	return t.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
}
var V;
var gr = class {
	constructor(e) {
		At(this, V);
		pn(this, V, new Set(e));
	}
	getLeadingWhitespaceCount(e) {
		let r = R(this, V), n = 0;
		for (let s = 0; s < e.length && r.has(e.charAt(s)); s++) n++;
		return n;
	}
	getTrailingWhitespaceCount(e) {
		let r = R(this, V), n = 0;
		for (let s = e.length - 1; s >= 0 && r.has(e.charAt(s)); s--) n++;
		return n;
	}
	getLeadingWhitespace(e) {
		let r = this.getLeadingWhitespaceCount(e);
		return e.slice(0, r);
	}
	getTrailingWhitespace(e) {
		let r = this.getTrailingWhitespaceCount(e);
		return e.slice(e.length - r);
	}
	hasLeadingWhitespace(e) {
		return R(this, V).has(e.charAt(0));
	}
	hasTrailingWhitespace(e) {
		return R(this, V).has(K(!1, e, -1));
	}
	trimStart(e) {
		let r = this.getLeadingWhitespaceCount(e);
		return e.slice(r);
	}
	trimEnd(e) {
		let r = this.getTrailingWhitespaceCount(e);
		return e.slice(0, e.length - r);
	}
	trim(e) {
		return this.trimEnd(this.trimStart(e));
	}
	split(e, r = !1) {
		let n = `[${dr([...R(this, V)].join(""))}]+`, s = new RegExp(r ? `(${n})` : n, "u");
		return e.split(s);
	}
	hasWhitespaceCharacter(e) {
		let r = R(this, V);
		return Array.prototype.some.call(e, (n) => r.has(n));
	}
	hasNonWhitespaceCharacter(e) {
		let r = R(this, V);
		return Array.prototype.some.call(e, (n) => !r.has(n));
	}
	isWhitespaceOnly(e) {
		let r = R(this, V);
		return Array.prototype.every.call(e, (n) => r.has(n));
	}
};
V = /* @__PURE__ */ new WeakMap();
var O = new gr([
	"	",
	`
`,
	"\f",
	"\r",
	" "
]);
var Cr = class extends Error {
	name = "UnexpectedNodeError";
	constructor(e, r, n = "type") {
		super(`Unexpected ${r} node ${n}: ${JSON.stringify(e[n])}.`), this.node = e;
	}
};
var An = Cr;
function Pi(t) {
	return (t == null ? void 0 : t.type) === "front-matter";
}
var Pe = Pi;
var Ni = /* @__PURE__ */ new Set([
	"sourceSpan",
	"startSourceSpan",
	"endSourceSpan",
	"nameSpan",
	"valueSpan",
	"keySpan",
	"tagDefinition",
	"tokens",
	"valueTokens",
	"switchValueSourceSpan",
	"expSourceSpan",
	"valueSourceSpan"
]);
var Ii = /* @__PURE__ */ new Set([
	"if",
	"else if",
	"for",
	"switch",
	"case"
]);
function Dn(t, e) {
	var r;
	if (t.type === "text" || t.type === "comment" || Pe(t) || t.type === "yaml" || t.type === "toml") return null;
	if (t.type === "attribute" && delete e.value, t.type === "docType" && delete e.value, t.type === "angularControlFlowBlock" && (r = t.parameters) != null && r.children) for (let n of e.parameters.children) Ii.has(t.name) ? delete n.expression : n.expression = n.expression.trim();
	t.type === "angularIcuExpression" && (e.switchValue = t.switchValue.trim()), t.type === "angularLetDeclarationInitializer" && delete e.value;
}
Dn.ignoredProperties = Ni;
var vn = Dn;
async function Ri(t, e) {
	if (t.language === "yaml") {
		let r = t.value.trim(), n = r ? await e(r, { parser: "yaml" }) : "";
		return gn([
			t.startDelimiter,
			t.explicitLanguage,
			S,
			n,
			n ? S : "",
			t.endDelimiter
		]);
	}
}
var yn = Ri;
function he(t, e = !0) {
	return [k([v, t]), e ? v : ""];
}
function X(t, e) {
	let r = t.type === "NGRoot" ? t.node.type === "NGMicrosyntax" && t.node.body.length === 1 && t.node.body[0].type === "NGMicrosyntaxExpression" ? t.node.body[0].expression : t.node : t.type === "JsExpressionRoot" ? t.node : t;
	return r && (r.type === "ObjectExpression" || r.type === "ArrayExpression" || (e.parser === "__vue_expression" || e.parser === "__vue_ts_expression") && (r.type === "TemplateLiteral" || r.type === "StringLiteral"));
}
async function T(t, e, r, n) {
	r = {
		__isInHtmlAttribute: !0,
		__embeddedInHtml: !0,
		...r
	};
	let s = !0;
	n && (r.__onHtmlBindingRoot = (a, o) => {
		s = n(a, o);
	});
	let i = await e(t, r, e);
	return s ? E(i) : he(i);
}
function $i(t, e, r, n) {
	let { node: s } = r, i = n.originalText.slice(s.sourceSpan.start.offset, s.sourceSpan.end.offset);
	return /^\s*$/u.test(i) ? "" : T(i, t, {
		parser: "__ng_directive",
		__isInHtmlAttribute: !1
	}, X);
}
var wn = $i;
var Oi = (t, e) => {
	if (!(t && e == null)) return e.toReversed || !Array.isArray(e) ? e.toReversed() : [...e].reverse();
};
var bn = Oi;
function Mi(t) {
	return Array.isArray(t) && t.length > 0;
}
var me = Mi;
var Tn;
var xn;
var kn;
var Bn;
var Ln;
var qi = ((Tn = globalThis.Deno) == null ? void 0 : Tn.build.os) === "windows" || ((kn = (xn = globalThis.navigator) == null ? void 0 : xn.platform) == null ? void 0 : kn.startsWith("Win")) || ((Ln = (Bn = globalThis.process) == null ? void 0 : Bn.platform) == null ? void 0 : Ln.startsWith("win")) || !1;
function Fn(t) {
	if (t = t instanceof URL ? t : new URL(t), t.protocol !== "file:") throw new TypeError(`URL must be a file URL: received "${t.protocol}"`);
	return t;
}
function Hi(t) {
	return t = Fn(t), decodeURIComponent(t.pathname.replace(/%(?![0-9A-Fa-f]{2})/g, "%25"));
}
function Vi(t) {
	t = Fn(t);
	let e = decodeURIComponent(t.pathname.replace(/\//g, "\\").replace(/%(?![0-9A-Fa-f]{2})/g, "%25")).replace(/^\\*([A-Za-z]:)(\\|$)/, "$1\\");
	return t.hostname !== "" && (e = `\\\\${t.hostname}${e}`), e;
}
function Pn(t) {
	return qi ? Vi(t) : Hi(t);
}
var Nn = Pn;
var Ui = (t) => String(t).split(/[/\\]/u).pop();
function In(t, e) {
	if (!e) return;
	let r = Ui(e).toLowerCase();
	return t.find(({ filenames: n }) => n == null ? void 0 : n.some((s) => s.toLowerCase() === r)) ?? t.find(({ extensions: n }) => n == null ? void 0 : n.some((s) => r.endsWith(s)));
}
function Wi(t, e) {
	if (e) return t.find(({ name: r }) => r.toLowerCase() === e) ?? t.find(({ aliases: r }) => r == null ? void 0 : r.includes(e)) ?? t.find(({ extensions: r }) => r == null ? void 0 : r.includes(`.${e}`));
}
function Rn(t, e) {
	if (e) {
		if (String(e).startsWith("file:")) try {
			e = Nn(e);
		} catch {
			return;
		}
		if (typeof e == "string") return t.find(({ isSupported: r }) => r == null ? void 0 : r({ filepath: e }));
	}
}
function Gi(t, e) {
	let r = bn(!1, t.plugins).flatMap((s) => s.languages ?? []), n = Wi(r, e.language) ?? In(r, e.physicalFile) ?? In(r, e.file) ?? Rn(r, e.physicalFile) ?? Rn(r, e.file) ?? (e.physicalFile, void 0);
	return n == null ? void 0 : n.parsers[0];
}
var Ne = Gi;
var $n = "inline";
var Sr = {
	area: "none",
	base: "none",
	basefont: "none",
	datalist: "none",
	head: "none",
	link: "none",
	meta: "none",
	noembed: "none",
	noframes: "none",
	param: "block",
	rp: "none",
	script: "block",
	style: "none",
	template: "inline",
	title: "none",
	html: "block",
	body: "block",
	address: "block",
	blockquote: "block",
	center: "block",
	dialog: "block",
	div: "block",
	figure: "block",
	figcaption: "block",
	footer: "block",
	form: "block",
	header: "block",
	hr: "block",
	legend: "block",
	listing: "block",
	main: "block",
	p: "block",
	plaintext: "block",
	pre: "block",
	search: "block",
	xmp: "block",
	slot: "contents",
	ruby: "ruby",
	rt: "ruby-text",
	article: "block",
	aside: "block",
	h1: "block",
	h2: "block",
	h3: "block",
	h4: "block",
	h5: "block",
	h6: "block",
	hgroup: "block",
	nav: "block",
	section: "block",
	dir: "block",
	dd: "block",
	dl: "block",
	dt: "block",
	menu: "block",
	ol: "block",
	ul: "block",
	li: "list-item",
	table: "table",
	caption: "table-caption",
	colgroup: "table-column-group",
	col: "table-column",
	thead: "table-header-group",
	tbody: "table-row-group",
	tfoot: "table-footer-group",
	tr: "table-row",
	td: "table-cell",
	th: "table-cell",
	input: "inline-block",
	button: "inline-block",
	fieldset: "block",
	details: "block",
	summary: "block",
	marquee: "inline-block",
	source: "block",
	track: "block",
	meter: "inline-block",
	progress: "inline-block",
	object: "inline-block",
	video: "inline-block",
	audio: "inline-block",
	select: "inline-block",
	option: "block",
	optgroup: "block"
};
var On = "normal";
var _r = {
	listing: "pre",
	plaintext: "pre",
	pre: "pre",
	xmp: "pre",
	nobr: "nowrap",
	table: "initial",
	textarea: "pre-wrap"
};
function zi(t) {
	return t.type === "element" && !t.hasExplicitNamespace && !["html", "svg"].includes(t.namespace);
}
var fe = zi;
var Yi = (t) => w(!1, t, /^[\t\f\r ]*\n/gu, "");
var Er = (t) => Yi(O.trimEnd(t));
var Mn = (t) => {
	let e = t, r = O.getLeadingWhitespace(e);
	r && (e = e.slice(r.length));
	let n = O.getTrailingWhitespace(e);
	return n && (e = e.slice(0, -n.length)), {
		leadingWhitespace: r,
		trailingWhitespace: n,
		text: e
	};
};
function wt(t, e) {
	return !!(t.type === "ieConditionalComment" && t.lastChild && !t.lastChild.isSelfClosing && !t.lastChild.endSourceSpan || t.type === "ieConditionalComment" && !t.complete || de(t) && t.children.some((r) => r.type !== "text" && r.type !== "interpolation") || xt(t, e) && !W(t, e) && t.type !== "interpolation");
}
function ge(t) {
	return t.type === "attribute" || !t.parent || !t.prev ? !1 : ji(t.prev);
}
function ji(t) {
	return t.type === "comment" && t.value.trim() === "prettier-ignore";
}
function $(t) {
	return t.type === "text" || t.type === "comment";
}
function W(t, e) {
	return t.type === "element" && (t.fullName === "script" || t.fullName === "style" || t.fullName === "svg:style" || t.fullName === "svg:script" || t.fullName === "mj-style" && e.parser === "mjml" || fe(t) && (t.name === "script" || t.name === "style"));
}
function qn(t, e) {
	return t.children && !W(t, e);
}
function Hn(t, e) {
	return W(t, e) || t.type === "interpolation" || Ar(t);
}
function Ar(t) {
	return Jn(t).startsWith("pre");
}
function Vn(t, e) {
	var s, i;
	let r = n();
	if (r && !t.prev && (i = (s = t.parent) == null ? void 0 : s.tagDefinition) != null && i.ignoreFirstLf) return t.type === "interpolation";
	return r;
	function n() {
		return Pe(t) || t.type === "angularControlFlowBlock" ? !1 : (t.type === "text" || t.type === "interpolation") && t.prev && (t.prev.type === "text" || t.prev.type === "interpolation") ? !0 : !t.parent || t.parent.cssDisplay === "none" ? !1 : de(t.parent) ? !0 : !(!t.prev && (t.parent.type === "root" || de(t) && t.parent || W(t.parent, e) || et(t.parent, e) || !ea(t.parent.cssDisplay)) || t.prev && !na(t.prev.cssDisplay));
	}
}
function Un(t, e) {
	return Pe(t) || t.type === "angularControlFlowBlock" ? !1 : (t.type === "text" || t.type === "interpolation") && t.next && (t.next.type === "text" || t.next.type === "interpolation") ? !0 : !t.parent || t.parent.cssDisplay === "none" ? !1 : de(t.parent) ? !0 : !(!t.next && (t.parent.type === "root" || de(t) && t.parent || W(t.parent, e) || et(t.parent, e) || !ta(t.parent.cssDisplay)) || t.next && !ra(t.next.cssDisplay));
}
function Wn(t, e) {
	return sa(t.cssDisplay) && !W(t, e);
}
function Je(t) {
	return Pe(t) || t.next && t.sourceSpan.end && t.sourceSpan.end.line + 1 < t.next.sourceSpan.start.line;
}
function Gn(t) {
	return Dr(t) || t.type === "element" && t.children.length > 0 && ([
		"body",
		"script",
		"style"
	].includes(t.name) || t.children.some((e) => Xi(e))) || t.firstChild && t.firstChild === t.lastChild && t.firstChild.type !== "text" && Yn(t.firstChild) && (!t.lastChild.isTrailingSpaceSensitive || jn(t.lastChild));
}
function Dr(t) {
	return t.type === "element" && t.children.length > 0 && ([
		"html",
		"head",
		"ul",
		"ol",
		"select"
	].includes(t.name) || t.cssDisplay.startsWith("table") && t.cssDisplay !== "table-cell");
}
function bt(t) {
	return Kn(t) || t.prev && Ki(t.prev) || zn(t);
}
function Ki(t) {
	return Kn(t) || t.type === "element" && t.fullName === "br" || zn(t);
}
function zn(t) {
	return Yn(t) && jn(t);
}
function Yn(t) {
	return t.hasLeadingSpaces && (t.prev ? t.prev.sourceSpan.end.line < t.sourceSpan.start.line : t.parent.type === "root" || t.parent.startSourceSpan.end.line < t.sourceSpan.start.line);
}
function jn(t) {
	return t.hasTrailingSpaces && (t.next ? t.next.sourceSpan.start.line > t.sourceSpan.end.line : t.parent.type === "root" || t.parent.endSourceSpan && t.parent.endSourceSpan.start.line > t.sourceSpan.end.line);
}
function Kn(t) {
	switch (t.type) {
		case "ieConditionalComment":
		case "comment":
		case "directive": return !0;
		case "element": return ["script", "select"].includes(t.name);
	}
	return !1;
}
function Tt(t) {
	return t.lastChild ? Tt(t.lastChild) : t;
}
function Xi(t) {
	var e;
	return (e = t.children) == null ? void 0 : e.some((r) => r.type !== "text");
}
function Xn(t) {
	if (t) switch (t) {
		case "module":
		case "text/javascript":
		case "text/babel":
		case "text/jsx":
		case "application/javascript": return "babel";
		case "application/x-typescript": return "typescript";
		case "text/markdown": return "markdown";
		case "text/html": return "html";
		case "text/x-handlebars-template": return "glimmer";
		default: if (t.endsWith("json") || t.endsWith("importmap") || t === "speculationrules") return "json";
	}
}
function Qi(t, e) {
	let { name: r, attrMap: n } = t;
	if (r !== "script" || Object.prototype.hasOwnProperty.call(n, "src")) return;
	let { type: s, lang: i } = t.attrMap;
	return !i && !s ? "babel" : Ne(e, { language: i }) ?? Xn(s);
}
function Ji(t, e) {
	if (!xt(t, e)) return;
	let { attrMap: r } = t;
	if (Object.prototype.hasOwnProperty.call(r, "src")) return;
	let { type: n, lang: s } = r;
	return Ne(e, { language: s }) ?? Xn(n);
}
function Zi(t, e) {
	if (t.name === "style") {
		let { lang: r } = t.attrMap;
		return r ? Ne(e, { language: r }) : "css";
	}
	if (t.name === "mj-style" && e.parser === "mjml") return "css";
}
function vr(t, e) {
	return Qi(t, e) ?? Zi(t, e) ?? Ji(t, e);
}
function Ze(t) {
	return t === "block" || t === "list-item" || t.startsWith("table");
}
function ea(t) {
	return !Ze(t) && t !== "inline-block";
}
function ta(t) {
	return !Ze(t) && t !== "inline-block";
}
function ra(t) {
	return !Ze(t);
}
function na(t) {
	return !Ze(t);
}
function sa(t) {
	return !Ze(t) && t !== "inline-block";
}
function de(t) {
	return Jn(t).startsWith("pre");
}
function ia(t, e) {
	let r = t;
	for (; r;) {
		if (e(r)) return !0;
		r = r.parent;
	}
	return !1;
}
function Qn(t, e) {
	var n;
	if (Ce(t, e)) return "block";
	if (((n = t.prev) == null ? void 0 : n.type) === "comment") {
		let s = t.prev.value.match(/^\s*display:\s*([a-z]+)\s*$/u);
		if (s) return s[1];
	}
	let r = !1;
	if (t.type === "element" && t.namespace === "svg") if (ia(t, (s) => s.fullName === "svg:foreignObject")) r = !0;
	else return t.name === "svg" ? "inline-block" : "block";
	switch (e.htmlWhitespaceSensitivity) {
		case "strict": return "inline";
		case "ignore": return "block";
		default: if (t.type === "element" && (!t.namespace || r || fe(t)) && Object.prototype.hasOwnProperty.call(Sr, t.name)) return Sr[t.name];
	}
	return $n;
}
function Jn(t) {
	return t.type === "element" && (!t.namespace || fe(t)) && Object.prototype.hasOwnProperty.call(_r, t.name) ? _r[t.name] : On;
}
function aa(t) {
	let e = Number.POSITIVE_INFINITY;
	for (let r of t.split(`
`)) {
		if (r.length === 0) continue;
		let n = O.getLeadingWhitespaceCount(r);
		if (n === 0) return 0;
		r.length !== n && n < e && (e = n);
	}
	return e === Number.POSITIVE_INFINITY ? 0 : e;
}
function yr(t, e = aa(t)) {
	return e === 0 ? t : t.split(`
`).map((r) => r.slice(e)).join(`
`);
}
function wr(t) {
	return w(!1, w(!1, t, "&apos;", "'"), "&quot;", "\"");
}
function P(t) {
	return wr(t.value);
}
var oa = /* @__PURE__ */ new Set([
	"template",
	"style",
	"script"
]);
function et(t, e) {
	return Ce(t, e) && !oa.has(t.fullName);
}
function Ce(t, e) {
	return e.parser === "vue" && t.type === "element" && t.parent.type === "root" && t.fullName.toLowerCase() !== "html";
}
function xt(t, e) {
	return Ce(t, e) && (et(t, e) || t.attrMap.lang && t.attrMap.lang !== "html");
}
function Zn(t) {
	let e = t.fullName;
	return e.charAt(0) === "#" || e === "slot-scope" || e === "v-slot" || e.startsWith("v-slot:");
}
function es(t, e) {
	let r = t.parent;
	if (!Ce(r, e)) return !1;
	let n = r.fullName, s = t.fullName;
	return n === "script" && s === "setup" || n === "style" && s === "vars";
}
function kt(t, e = t.value) {
	return t.parent.isWhitespaceSensitive ? t.parent.isIndentationSensitive ? B(e) : B(yr(Er(e)), S) : H(_, O.split(e));
}
function Bt(t, e) {
	return Ce(t, e) && t.name === "script";
}
var br = /\{\{(.+?)\}\}/su;
async function ts(t, e) {
	let r = [];
	for (let [n, s] of t.split(br).entries()) if (n % 2 === 0) r.push(B(s));
	else try {
		r.push(E([
			"{{",
			k([_, await T(s, e, {
				parser: "__ng_interpolation",
				__isInHtmlInterpolation: !0
			})]),
			_,
			"}}"
		]));
	} catch {
		r.push("{{", B(s), "}}");
	}
	return r;
}
function Tr({ parser: t }) {
	return (e, r, n) => T(P(n.node), e, { parser: t }, X);
}
var ua = Tr({ parser: "__ng_action" });
var la = Tr({ parser: "__ng_binding" });
var ca = Tr({ parser: "__ng_directive" });
function pa(t, e) {
	if (e.parser !== "angular") return;
	let { node: r } = t, n = r.fullName;
	if (n.startsWith("(") && n.endsWith(")") || n.startsWith("on-")) return ua;
	if (n.startsWith("[") && n.endsWith("]") || /^bind(?:on)?-/u.test(n) || /^ng-(?:if|show|hide|class|style)$/u.test(n)) return la;
	if (n.startsWith("*")) return ca;
	let s = P(r);
	if (/^i18n(?:-.+)?$/u.test(n)) return () => he(vt(kt(r, s.trim())), !s.includes("@@"));
	if (br.test(s)) return (i) => ts(s, i);
}
var rs = pa;
function ha(t, e) {
	let { node: r } = t, n = P(r);
	if (r.fullName === "class" && !e.parentParser && !n.includes("{{")) return () => n.trim().split(/\s+/u).join(" ");
}
var ns = ha;
function ss(t) {
	return t === "	" || t === `
` || t === "\f" || t === "\r" || t === " ";
}
var ma = /^[ \t\n\r\u000c]+/;
var fa = /^[, \t\n\r\u000c]+/;
var da = /^[^ \t\n\r\u000c]+/;
var ga = /[,]+$/;
var is = /^\d+$/;
var Ca = /^-?(?:[0-9]+|[0-9]*\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/;
function Sa(t) {
	let e = t.length, r, n, s, i, a, o = 0, u;
	function p(C) {
		let A, D = C.exec(t.substring(o));
		if (D) return [A] = D, o += A.length, A;
	}
	let l = [];
	for (;;) {
		if (p(fa), o >= e) {
			if (l.length === 0) throw new Error("Must contain one or more image candidate strings.");
			return l;
		}
		u = o, r = p(da), n = [], r.slice(-1) === "," ? (r = r.replace(ga, ""), f()) : m();
	}
	function m() {
		for (p(ma), s = "", i = "in descriptor";;) {
			if (a = t.charAt(o), i === "in descriptor") if (ss(a)) s && (n.push(s), s = "", i = "after descriptor");
			else if (a === ",") {
				o += 1, s && n.push(s), f();
				return;
			} else if (a === "(") s += a, i = "in parens";
			else if (a === "") {
				s && n.push(s), f();
				return;
			} else s += a;
			else if (i === "in parens") if (a === ")") s += a, i = "in descriptor";
			else if (a === "") {
				n.push(s), f();
				return;
			} else s += a;
			else if (i === "after descriptor" && !ss(a)) if (a === "") {
				f();
				return;
			} else i = "in descriptor", o -= 1;
			o += 1;
		}
	}
	function f() {
		let C = !1, A, D, I, F, c = {}, g, y, q, x, U;
		for (F = 0; F < n.length; F++) g = n[F], y = g[g.length - 1], q = g.substring(0, g.length - 1), x = parseInt(q, 10), U = parseFloat(q), is.test(q) && y === "w" ? ((A || D) && (C = !0), x === 0 ? C = !0 : A = x) : Ca.test(q) && y === "x" ? ((A || D || I) && (C = !0), U < 0 ? C = !0 : D = U) : is.test(q) && y === "h" ? ((I || D) && (C = !0), x === 0 ? C = !0 : I = x) : C = !0;
		if (!C) c.source = {
			value: r,
			startOffset: u
		}, A && (c.width = { value: A }), D && (c.density = { value: D }), I && (c.height = { value: I }), l.push(c);
		else throw new Error(`Invalid srcset descriptor found in "${t}" at "${g}".`);
	}
}
var as = Sa;
function _a(t) {
	if (t.node.fullName === "srcset" && (t.parent.fullName === "img" || t.parent.fullName === "source")) return () => Aa(P(t.node));
}
var os = {
	width: "w",
	height: "h",
	density: "x"
};
var Ea = Object.keys(os);
function Aa(t) {
	let e = as(t), r = Ea.filter((l) => e.some((m) => Object.prototype.hasOwnProperty.call(m, l)));
	if (r.length > 1) throw new Error("Mixed descriptor in srcset is not supported");
	let [n] = r, s = os[n], i = e.map((l) => l.source.value), a = Math.max(...i.map((l) => l.length)), o = e.map((l) => l[n] ? String(l[n].value) : ""), u = o.map((l) => {
		let m = l.indexOf(".");
		return m === -1 ? l.length : m;
	}), p = Math.max(...u);
	return he(H([",", _], i.map((l, m) => {
		let f = [l], C = o[m];
		if (C) {
			let A = a - l.length + 1, D = p - u[m], I = " ".repeat(A + D);
			f.push(pe(I, " "), C + s);
		}
		return f;
	})));
}
var us = _a;
function ls(t, e) {
	let { node: r } = t, n = P(t.node).trim();
	if (r.fullName === "style" && !e.parentParser && !n.includes("{{")) return async (s) => he(await s(n, {
		parser: "css",
		__isHTMLStyleAttribute: !0
	}));
}
var xr = /* @__PURE__ */ new WeakMap();
function Da(t, e) {
	let { root: r } = t;
	return xr.has(r) || xr.set(r, r.children.some((n) => Bt(n, e) && ["ts", "typescript"].includes(n.attrMap.lang))), xr.get(r);
}
var Ie = Da;
function cs(t, e, r) {
	let { node: n } = r;
	return T(`type T<${P(n)}> = any`, t, {
		parser: "babel-ts",
		__isEmbeddedTypescriptGenericParameters: !0
	}, X);
}
function ps(t, e, { parseWithTs: r }) {
	return T(`function _(${t}) {}`, e, {
		parser: r ? "babel-ts" : "babel",
		__isVueBindings: !0
	});
}
async function hs(t, e, r, n) {
	let { left: i, operator: a, right: o } = va(P(r.node)), u = Ie(r, n);
	return [
		E(await T(`function _(${i}) {}`, t, {
			parser: u ? "babel-ts" : "babel",
			__isVueForBindingLeft: !0
		})),
		" ",
		a,
		" ",
		await T(o, t, { parser: u ? "__ts_expression" : "__js_expression" })
	];
}
function va(t) {
	let e = /(.*?)\s+(in|of)\s+(.*)/su, r = /,([^,\]}]*)(?:,([^,\]}]*))?$/u, n = /^\(|\)$/gu, s = t.match(e);
	if (!s) return;
	let i = {};
	if (i.for = s[3].trim(), !i.for) return;
	let a = w(!1, s[1].trim(), n, ""), o = a.match(r);
	o ? (i.alias = a.replace(r, ""), i.iterator1 = o[1].trim(), o[2] && (i.iterator2 = o[2].trim())) : i.alias = a;
	let u = [
		i.alias,
		i.iterator1,
		i.iterator2
	];
	if (!u.some((p, l) => !p && (l === 0 || u.slice(l + 1).some(Boolean)))) return {
		left: u.filter(Boolean).join(","),
		operator: s[2],
		right: i.for
	};
}
function ya(t, e) {
	if (e.parser !== "vue") return;
	let { node: r } = t, n = r.fullName;
	if (n === "v-for") return hs;
	if (n === "generic" && Bt(r.parent, e)) return cs;
	let s = P(r), i = Ie(t, e);
	if (Zn(r) || es(r, e)) return (a) => ps(s, a, { parseWithTs: i });
	if (n.startsWith("@") || n.startsWith("v-on:")) return (a) => wa(s, a, { parseWithTs: i });
	if (n.startsWith(":") || n.startsWith(".") || n.startsWith("v-bind:")) return (a) => ba(s, a, { parseWithTs: i });
	if (n.startsWith("v-")) return (a) => ms(s, a, { parseWithTs: i });
}
async function wa(t, e, { parseWithTs: r }) {
	var n;
	try {
		return await ms(t, e, { parseWithTs: r });
	} catch (s) {
		if (((n = s.cause) == null ? void 0 : n.code) !== "BABEL_PARSER_SYNTAX_ERROR") throw s;
	}
	return T(t, e, { parser: r ? "__vue_ts_event_binding" : "__vue_event_binding" }, X);
}
function ba(t, e, { parseWithTs: r }) {
	return T(t, e, { parser: r ? "__vue_ts_expression" : "__vue_expression" }, X);
}
function ms(t, e, { parseWithTs: r }) {
	return T(t, e, { parser: r ? "__ts_expression" : "__js_expression" }, X);
}
var fs = ya;
function Ta(t, e) {
	let { node: r } = t;
	if (r.value) {
		if (/^PRETTIER_HTML_PLACEHOLDER_\d+_\d+_IN_JS$/u.test(e.originalText.slice(r.valueSpan.start.offset, r.valueSpan.end.offset)) || e.parser === "lwc" && r.value.startsWith("{") && r.value.endsWith("}")) return [
			r.rawName,
			"=",
			r.value
		];
		for (let n of [
			us,
			ls,
			ns,
			fs,
			rs
		]) {
			let s = n(t, e);
			if (s) return xa(s);
		}
	}
}
function xa(t) {
	return async (e, r, n, s) => {
		let i = await t(e, r, n, s);
		if (i) return i = hr(i, (a) => typeof a == "string" ? w(!1, a, "\"", "&quot;") : a), [
			n.node.rawName,
			"=\"",
			E(i),
			"\""
		];
	};
}
var ds = Ta;
var ka = new Proxy(() => {}, { get: () => ka });
function J(t) {
	return t.sourceSpan.start.offset;
}
function se(t) {
	return t.sourceSpan.end.offset;
}
function tt(t, e) {
	return [t.isSelfClosing ? "" : Ba(t, e), Se(t, e)];
}
function Ba(t, e) {
	return t.lastChild && Ae(t.lastChild) ? "" : [La(t, e), Lt(t, e)];
}
function Se(t, e) {
	return (t.next ? Q(t.next) : Ee(t.parent)) ? "" : [_e(t, e), G(t, e)];
}
function La(t, e) {
	return Ee(t) ? _e(t.lastChild, e) : "";
}
function G(t, e) {
	return Ae(t) ? Lt(t.parent, e) : rt(t) ? Ft(t.next, e) : "";
}
function Lt(t, e) {
	if (Cs(t, e)) return "";
	switch (t.type) {
		case "ieConditionalComment": return "<!";
		case "element": if (t.hasHtmComponentClosingTag) return "<//";
		default: return `</${t.rawName}`;
	}
}
function _e(t, e) {
	if (Cs(t, e)) return "";
	switch (t.type) {
		case "ieConditionalComment":
		case "ieConditionalEndComment": return "[endif]-->";
		case "ieConditionalStartComment": return "]><!-->";
		case "interpolation": return "}}";
		case "angularIcuExpression": return "}";
		case "element": if (t.isSelfClosing) return "/>";
		default: return ">";
	}
}
function Cs(t, e) {
	return !t.isSelfClosing && !t.endSourceSpan && (ge(t) || wt(t.parent, e));
}
function Q(t) {
	return t.prev && t.prev.type !== "docType" && t.type !== "angularControlFlowBlock" && !$(t.prev) && t.isLeadingSpaceSensitive && !t.hasLeadingSpaces;
}
function Ee(t) {
	var e;
	return ((e = t.lastChild) == null ? void 0 : e.isTrailingSpaceSensitive) && !t.lastChild.hasTrailingSpaces && !$(Tt(t.lastChild)) && !de(t);
}
function Ae(t) {
	return !t.next && !t.hasTrailingSpaces && t.isTrailingSpaceSensitive && $(Tt(t));
}
function rt(t) {
	return t.next && !$(t.next) && $(t) && t.isTrailingSpaceSensitive && !t.hasTrailingSpaces;
}
function Fa(t) {
	let e = t.trim().match(/^prettier-ignore-attribute(?:\s+(.+))?$/su);
	return e ? e[1] ? e[1].split(/\s+/u) : !0 : !1;
}
function nt(t) {
	return !t.prev && t.isLeadingSpaceSensitive && !t.hasLeadingSpaces;
}
function Pa(t, e, r) {
	var m;
	let { node: n } = t;
	if (!me(n.attrs)) return n.isSelfClosing ? " " : "";
	let s = ((m = n.prev) == null ? void 0 : m.type) === "comment" && Fa(n.prev.value), i = typeof s == "boolean" ? () => s : Array.isArray(s) ? (f) => s.includes(f.rawName) : () => !1, a = t.map(({ node: f }) => i(f) ? B(e.originalText.slice(J(f), se(f))) : r(), "attrs"), o = n.type === "element" && n.fullName === "script" && n.attrs.length === 1 && n.attrs[0].fullName === "src" && n.children.length === 0, p = e.singleAttributePerLine && n.attrs.length > 1 && !Ce(n, e) ? S : _, l = [k([o ? " " : _, H(p, a)])];
	return n.firstChild && nt(n.firstChild) || n.isSelfClosing && Ee(n.parent) || o ? l.push(n.isSelfClosing ? " " : "") : l.push(e.bracketSameLine ? n.isSelfClosing ? " " : "" : n.isSelfClosing ? _ : v), l;
}
function Na(t) {
	return t.firstChild && nt(t.firstChild) ? "" : Pt(t);
}
function st(t, e, r) {
	let { node: n } = t;
	return [
		De(n, e),
		Pa(t, e, r),
		n.isSelfClosing ? "" : Na(n)
	];
}
function De(t, e) {
	return t.prev && rt(t.prev) ? "" : [z(t, e), Ft(t, e)];
}
function z(t, e) {
	return nt(t) ? Pt(t.parent) : Q(t) ? _e(t.prev, e) : "";
}
var gs = "<!doctype";
function Ft(t, e) {
	switch (t.type) {
		case "ieConditionalComment":
		case "ieConditionalStartComment": return `<!--[if ${t.condition}`;
		case "ieConditionalEndComment": return "<!--<!";
		case "interpolation": return "{{";
		case "docType": {
			if (t.value === "html") {
				let { filepath: n } = e;
				if (n && /\.html?$/u.test(n)) return gs;
			}
			let r = J(t);
			return e.originalText.slice(r, r + gs.length);
		}
		case "angularIcuExpression": return "{";
		case "element": if (t.condition) return `<!--[if ${t.condition}]><!--><${t.rawName}`;
		default: return `<${t.rawName}`;
	}
}
function Pt(t) {
	switch (t.type) {
		case "ieConditionalComment": return "]>";
		case "element": if (t.condition) return "><!--<![endif]-->";
		default: return ">";
	}
}
function Ia(t, e) {
	if (!t.endSourceSpan) return "";
	let r = t.startSourceSpan.end.offset;
	t.firstChild && nt(t.firstChild) && (r -= Pt(t).length);
	let n = t.endSourceSpan.start.offset;
	return t.lastChild && Ae(t.lastChild) ? n += Lt(t, e).length : Ee(t) && (n -= _e(t.lastChild, e).length), e.originalText.slice(r, n);
}
var Nt = Ia;
var Ra = /* @__PURE__ */ new Set([
	"if",
	"else if",
	"for",
	"switch",
	"case"
]);
function $a(t, e) {
	let { node: r } = t;
	switch (r.type) {
		case "element":
			if (W(r, e) || r.type === "interpolation") return;
			if (!r.isSelfClosing && xt(r, e)) {
				let n = vr(r, e);
				return n ? async (s, i) => {
					let a = Nt(r, e), o = /^\s*$/u.test(a), u = "";
					return o || (u = await s(Er(a), {
						parser: n,
						__embeddedInHtml: !0
					}), o = u === ""), [
						z(r, e),
						E(st(t, e, i)),
						o ? "" : S,
						u,
						o ? "" : S,
						tt(r, e),
						G(r, e)
					];
				} : void 0;
			}
			break;
		case "text":
			if (W(r.parent, e)) {
				let n = vr(r.parent, e);
				if (n) return async (s) => {
					let i = n === "markdown" ? yr(r.value.replace(/^[^\S\n]*\n/u, "")) : r.value, a = {
						parser: n,
						__embeddedInHtml: !0
					};
					if (e.parser === "html" && n === "babel") {
						let o = "script", { attrMap: u } = r.parent;
						u && (u.type === "module" || (u.type === "text/babel" || u.type === "text/jsx") && u["data-type"] === "module") && (o = "module"), a.__babelSourceType = o;
					}
					return [
						ne,
						z(r, e),
						await s(i, a),
						G(r, e)
					];
				};
			} else if (r.parent.type === "interpolation") return async (n) => {
				let s = {
					__isInHtmlInterpolation: !0,
					__embeddedInHtml: !0
				};
				return e.parser === "angular" ? s.parser = "__ng_interpolation" : e.parser === "vue" ? s.parser = Ie(t, e) ? "__vue_ts_expression" : "__vue_expression" : s.parser = "__js_expression", [k([_, await n(r.value, s)]), r.parent.next && Q(r.parent.next) ? " " : _];
			};
			break;
		case "attribute": return ds(t, e);
		case "front-matter": return (n) => yn(r, n);
		case "angularControlFlowBlockParameters": return Ra.has(t.parent.name) ? wn : void 0;
		case "angularLetDeclarationInitializer": return (n) => T(r.value, n, {
			parser: "__ng_binding",
			__isInHtmlAttribute: !1
		});
	}
}
var Ss = $a;
var it = null;
function at(t) {
	if (it !== null && typeof it.property) {
		let e = it;
		return it = at.prototype = null, e;
	}
	return it = at.prototype = t ?? Object.create(null), new at();
}
var Oa = 10;
for (let t = 0; t <= Oa; t++) at();
function kr(t) {
	return at(t);
}
function Ma(t, e = "type") {
	kr(t);
	function r(n) {
		let s = n[e], i = t[s];
		if (!Array.isArray(i)) throw Object.assign(/* @__PURE__ */ new Error(`Missing visitor keys for '${s}'.`), { node: n });
		return i;
	}
	return r;
}
var As = Ma({
	"front-matter": [],
	root: ["children"],
	element: ["attrs", "children"],
	ieConditionalComment: ["children"],
	ieConditionalStartComment: [],
	ieConditionalEndComment: [],
	interpolation: ["children"],
	text: ["children"],
	docType: [],
	comment: [],
	attribute: [],
	cdata: [],
	angularControlFlowBlock: ["children", "parameters"],
	angularControlFlowBlockParameters: ["children"],
	angularControlFlowBlockParameter: [],
	angularLetDeclaration: ["init"],
	angularLetDeclarationInitializer: [],
	angularIcuExpression: ["cases"],
	angularIcuCase: ["expression"]
});
var Ds = "format";
var vs = /^\s*<!--\s*@(?:noformat|noprettier)\s*-->/u;
var ys = /^\s*<!--\s*@(?:format|prettier)\s*-->/u;
function ws(t) {
	return ys.test(t);
}
function bs(t) {
	return vs.test(t);
}
function Ts(t) {
	return `<!-- @${Ds} -->

${t}`;
}
var xs = /* @__PURE__ */ new Map([
	["if", /* @__PURE__ */ new Set(["else if", "else"])],
	["else if", /* @__PURE__ */ new Set(["else if", "else"])],
	["for", /* @__PURE__ */ new Set(["empty"])],
	["defer", /* @__PURE__ */ new Set([
		"placeholder",
		"error",
		"loading"
	])],
	["placeholder", /* @__PURE__ */ new Set([
		"placeholder",
		"error",
		"loading"
	])],
	["error", /* @__PURE__ */ new Set([
		"placeholder",
		"error",
		"loading"
	])],
	["loading", /* @__PURE__ */ new Set([
		"placeholder",
		"error",
		"loading"
	])]
]);
function ks(t) {
	let e = se(t);
	return t.type === "element" && !t.endSourceSpan && me(t.children) ? Math.max(e, ks(K(!1, t.children, -1))) : e;
}
function ot(t, e, r) {
	let n = t.node;
	if (ge(n)) {
		let s = ks(n);
		return [
			z(n, e),
			B(O.trimEnd(e.originalText.slice(J(n) + (n.prev && rt(n.prev) ? Ft(n).length : 0), s - (n.next && Q(n.next) ? _e(n, e).length : 0)))),
			G(n, e)
		];
	}
	return r();
}
function It(t, e) {
	return $(t) && $(e) ? t.isTrailingSpaceSensitive ? t.hasTrailingSpaces ? bt(e) ? S : _ : "" : bt(e) ? S : v : rt(t) && (ge(e) || e.firstChild || e.isSelfClosing || e.type === "element" && e.attrs.length > 0) || t.type === "element" && t.isSelfClosing && Q(e) ? "" : !e.isLeadingSpaceSensitive || bt(e) || Q(e) && t.lastChild && Ae(t.lastChild) && t.lastChild.lastChild && Ae(t.lastChild.lastChild) ? S : e.hasLeadingSpaces ? _ : v;
}
function Re(t, e, r) {
	let { node: n } = t;
	if (Dr(n)) return [ne, ...t.map((i) => {
		let a = i.node, o = a.prev ? It(a.prev, a) : "";
		return [o ? [o, Je(a.prev) ? S : ""] : "", ot(i, e, r)];
	}, "children")];
	let s = n.children.map(() => Symbol(""));
	return t.map((i, a) => {
		let o = i.node;
		if ($(o)) {
			if (o.prev && $(o.prev)) {
				let A = It(o.prev, o);
				if (A) return Je(o.prev) ? [
					S,
					S,
					ot(i, e, r)
				] : [A, ot(i, e, r)];
			}
			return ot(i, e, r);
		}
		let u = [], p = [], l = [], m = [], f = o.prev ? It(o.prev, o) : "", C = o.next ? It(o, o.next) : "";
		return f && (Je(o.prev) ? u.push(S, S) : f === S ? u.push(S) : $(o.prev) ? p.push(f) : p.push(pe("", v, { groupId: s[a - 1] }))), C && (Je(o) ? $(o.next) && m.push(S, S) : C === S ? $(o.next) && m.push(S) : l.push(C)), [
			...u,
			E([...p, E([ot(i, e, r), ...l], { id: s[a] })]),
			...m
		];
	}, "children");
}
function Bs(t, e, r) {
	let { node: n } = t, s = [];
	Va(t) && s.push("} "), s.push("@", n.name), n.parameters && s.push(" (", E(r("parameters")), ")"), s.push(" {");
	let i = Ls(n);
	return n.children.length > 0 ? (n.firstChild.hasLeadingSpaces = !0, n.lastChild.hasTrailingSpaces = !0, s.push(k([S, Re(t, e, r)])), i && s.push(S, "}")) : i && s.push("}"), E(s, { shouldBreak: !0 });
}
function Ls(t) {
	var e, r;
	return !(((e = t.next) == null ? void 0 : e.type) === "angularControlFlowBlock" && (r = xs.get(t.name)) != null && r.has(t.next.name));
}
function Va(t) {
	let { previous: e } = t;
	return (e == null ? void 0 : e.type) === "angularControlFlowBlock" && !ge(e) && !Ls(e);
}
function Fs(t, e, r) {
	return [k([v, H([";", _], t.map(r, "children"))]), v];
}
function Ps(t, e, r) {
	let { node: n } = t;
	return [
		De(n, e),
		E([
			n.switchValue.trim(),
			", ",
			n.clause,
			n.cases.length > 0 ? [",", k([_, H(_, t.map(r, "cases"))])] : "",
			v
		]),
		Se(n, e)
	];
}
function Ns(t, e, r) {
	let { node: n } = t;
	return [
		n.value,
		" {",
		E([k([v, t.map(({ node: s, isLast: i }) => {
			let a = [r()];
			return s.type === "text" && (s.hasLeadingSpaces && a.unshift(_), s.hasTrailingSpaces && !i && a.push(_)), a;
		}, "expression")]), v]),
		"}"
	];
}
function Is(t, e, r) {
	let { node: n } = t;
	if (wt(n, e)) return [
		z(n, e),
		E(st(t, e, r)),
		B(Nt(n, e)),
		...tt(n, e),
		G(n, e)
	];
	let s = n.children.length === 1 && (n.firstChild.type === "interpolation" || n.firstChild.type === "angularIcuExpression") && n.firstChild.isLeadingSpaceSensitive && !n.firstChild.hasLeadingSpaces && n.lastChild.isTrailingSpaceSensitive && !n.lastChild.hasTrailingSpaces, i = Symbol("element-attr-group-id"), a = (l) => E([
		E(st(t, e, r), { id: i }),
		l,
		tt(n, e)
	]), o = (l) => s ? Cn(l, { groupId: i }) : (W(n, e) || et(n, e)) && n.parent.type === "root" && e.parser === "vue" && !e.vueIndentScriptAndStyle ? l : k(l), u = () => s ? pe(v, "", { groupId: i }) : n.firstChild.hasLeadingSpaces && n.firstChild.isLeadingSpaceSensitive ? _ : n.firstChild.type === "text" && n.isWhitespaceSensitive && n.isIndentationSensitive ? dn(v) : v, p = () => (n.next ? Q(n.next) : Ee(n.parent)) ? n.lastChild.hasTrailingSpaces && n.lastChild.isTrailingSpaceSensitive ? " " : "" : s ? pe(v, "", { groupId: i }) : n.lastChild.hasTrailingSpaces && n.lastChild.isTrailingSpaceSensitive ? _ : (n.lastChild.type === "comment" || n.lastChild.type === "text" && n.isWhitespaceSensitive && n.isIndentationSensitive) && new RegExp(`\\n[\\t ]{${e.tabWidth * (t.ancestors.length - 1)}}$`, "u").test(n.lastChild.value) ? "" : v;
	return n.children.length === 0 ? a(n.hasDanglingSpaces && n.isDanglingSpaceSensitive ? _ : "") : a([
		Gn(n) ? ne : "",
		o([u(), Re(t, e, r)]),
		p()
	]);
}
function ut(t) {
	return t >= 9 && t <= 32 || t == 160;
}
function Rt(t) {
	return 48 <= t && t <= 57;
}
function lt(t) {
	return t >= 97 && t <= 122 || t >= 65 && t <= 90;
}
function Rs(t) {
	return t >= 97 && t <= 102 || t >= 65 && t <= 70 || Rt(t);
}
function $t(t) {
	return t === 10 || t === 13;
}
function Br(t) {
	return 48 <= t && t <= 55;
}
function Ot(t) {
	return t === 39 || t === 34 || t === 96;
}
var Ua = /-+([a-z0-9])/g;
function Os(t) {
	return t.replace(Ua, (...e) => e[1].toUpperCase());
}
var ie = class t {
	constructor(e, r, n, s) {
		this.file = e, this.offset = r, this.line = n, this.col = s;
	}
	toString() {
		return this.offset != null ? `${this.file.url}@${this.line}:${this.col}` : this.file.url;
	}
	moveBy(e) {
		let r = this.file.content, n = r.length, s = this.offset, i = this.line, a = this.col;
		for (; s > 0 && e < 0;) if (s--, e++, r.charCodeAt(s) == 10) {
			i--;
			let u = r.substring(0, s - 1).lastIndexOf(String.fromCharCode(10));
			a = u > 0 ? s - u : s;
		} else a--;
		for (; s < n && e > 0;) {
			let o = r.charCodeAt(s);
			s++, e--, o == 10 ? (i++, a = 0) : a++;
		}
		return new t(this.file, s, i, a);
	}
	getContext(e, r) {
		let n = this.file.content, s = this.offset;
		if (s != null) {
			s > n.length - 1 && (s = n.length - 1);
			let i = s, a = 0, o = 0;
			for (; a < e && s > 0 && (s--, a++, !(n[s] == `
` && ++o == r)););
			for (a = 0, o = 0; a < e && i < n.length - 1 && (i++, a++, !(n[i] == `
` && ++o == r)););
			return {
				before: n.substring(s, this.offset),
				after: n.substring(this.offset, i + 1)
			};
		}
		return null;
	}
};
var ve = class {
	constructor(e, r) {
		this.content = e, this.url = r;
	}
};
var h = class {
	constructor(e, r, n = e, s = null) {
		this.start = e, this.end = r, this.fullStart = n, this.details = s;
	}
	toString() {
		return this.start.file.content.substring(this.start.offset, this.end.offset);
	}
};
var Mt;
(function(t) {
	t[t.WARNING = 0] = "WARNING", t[t.ERROR = 1] = "ERROR";
})(Mt || (Mt = {}));
var Oe = class {
	constructor(e, r, n = Mt.ERROR, s) {
		this.span = e, this.msg = r, this.level = n, this.relatedError = s;
	}
	contextualMessage() {
		let e = this.span.start.getContext(100, 3);
		return e ? `${this.msg} ("${e.before}[${Mt[this.level]} ->]${e.after}")` : this.msg;
	}
	toString() {
		let e = this.span.details ? `, ${this.span.details}` : "";
		return `${this.contextualMessage()}: ${this.span.start}${e}`;
	}
};
var Wa = [
	za,
	Ya,
	Ka,
	Qa,
	Ja,
	to,
	Za,
	eo,
	ro,
	Xa
];
function Ga(t, e) {
	for (let r of Wa) r(t, e);
	return t;
}
function za(t) {
	t.walk((e) => {
		if (e.type === "element" && e.tagDefinition.ignoreFirstLf && e.children.length > 0 && e.children[0].type === "text" && e.children[0].value[0] === `
`) {
			let r = e.children[0];
			r.value.length === 1 ? e.removeChild(r) : r.value = r.value.slice(1);
		}
	});
}
function Ya(t) {
	let e = (r) => {
		var n, s;
		return r.type === "element" && ((n = r.prev) == null ? void 0 : n.type) === "ieConditionalStartComment" && r.prev.sourceSpan.end.offset === r.startSourceSpan.start.offset && ((s = r.firstChild) == null ? void 0 : s.type) === "ieConditionalEndComment" && r.firstChild.sourceSpan.start.offset === r.startSourceSpan.end.offset;
	};
	t.walk((r) => {
		if (r.children) for (let n = 0; n < r.children.length; n++) {
			let s = r.children[n];
			if (!e(s)) continue;
			let i = s.prev, a = s.firstChild;
			r.removeChild(i), n--;
			let o = new h(i.sourceSpan.start, a.sourceSpan.end), u = new h(o.start, s.sourceSpan.end);
			s.condition = i.condition, s.sourceSpan = u, s.startSourceSpan = o, s.removeChild(a);
		}
	});
}
function ja(t, e, r) {
	t.walk((n) => {
		if (n.children) for (let s = 0; s < n.children.length; s++) {
			let i = n.children[s];
			if (i.type !== "text" && !e(i)) continue;
			i.type !== "text" && (i.type = "text", i.value = r(i));
			let a = i.prev;
			!a || a.type !== "text" || (a.value += i.value, a.sourceSpan = new h(a.sourceSpan.start, i.sourceSpan.end), n.removeChild(i), s--);
		}
	});
}
function Ka(t) {
	return ja(t, (e) => e.type === "cdata", (e) => `<![CDATA[${e.value}]]>`);
}
function Xa(t) {
	let e = (r) => {
		var n, s;
		return r.type === "element" && r.attrs.length === 0 && r.children.length === 1 && r.firstChild.type === "text" && !O.hasWhitespaceCharacter(r.children[0].value) && !r.firstChild.hasLeadingSpaces && !r.firstChild.hasTrailingSpaces && r.isLeadingSpaceSensitive && !r.hasLeadingSpaces && r.isTrailingSpaceSensitive && !r.hasTrailingSpaces && ((n = r.prev) == null ? void 0 : n.type) === "text" && ((s = r.next) == null ? void 0 : s.type) === "text";
	};
	t.walk((r) => {
		if (r.children) for (let n = 0; n < r.children.length; n++) {
			let s = r.children[n];
			if (!e(s)) continue;
			let i = s.prev, a = s.next;
			i.value += `<${s.rawName}>` + s.firstChild.value + `</${s.rawName}>` + a.value, i.sourceSpan = new h(i.sourceSpan.start, a.sourceSpan.end), i.isTrailingSpaceSensitive = a.isTrailingSpaceSensitive, i.hasTrailingSpaces = a.hasTrailingSpaces, r.removeChild(s), n--, r.removeChild(a);
		}
	});
}
function Qa(t, e) {
	if (e.parser === "html") return;
	let r = /\{\{(.+?)\}\}/su;
	t.walk((n) => {
		if (qn(n, e)) for (let s of n.children) {
			if (s.type !== "text") continue;
			let i = s.sourceSpan.start, a = null, o = s.value.split(r);
			for (let u = 0; u < o.length; u++, i = a) {
				let p = o[u];
				if (u % 2 === 0) {
					a = i.moveBy(p.length), p.length > 0 && n.insertChildBefore(s, {
						type: "text",
						value: p,
						sourceSpan: new h(i, a)
					});
					continue;
				}
				a = i.moveBy(p.length + 4), n.insertChildBefore(s, {
					type: "interpolation",
					sourceSpan: new h(i, a),
					children: p.length === 0 ? [] : [{
						type: "text",
						value: p,
						sourceSpan: new h(i.moveBy(2), a.moveBy(-2))
					}]
				});
			}
			n.removeChild(s);
		}
	});
}
function Ja(t, e) {
	t.walk((r) => {
		let n = r.$children;
		if (!n) return;
		if (n.length === 0 || n.length === 1 && n[0].type === "text" && O.trim(n[0].value).length === 0) {
			r.hasDanglingSpaces = n.length > 0, r.$children = [];
			return;
		}
		let s = Hn(r, e), i = Ar(r);
		if (!s) for (let a = 0; a < n.length; a++) {
			let o = n[a];
			if (o.type !== "text") continue;
			let { leadingWhitespace: u, text: p, trailingWhitespace: l } = Mn(o.value), m = o.prev, f = o.next;
			p ? (o.value = p, o.sourceSpan = new h(o.sourceSpan.start.moveBy(u.length), o.sourceSpan.end.moveBy(-l.length)), u && (m && (m.hasTrailingSpaces = !0), o.hasLeadingSpaces = !0), l && (o.hasTrailingSpaces = !0, f && (f.hasLeadingSpaces = !0))) : (r.removeChild(o), a--, (u || l) && (m && (m.hasTrailingSpaces = !0), f && (f.hasLeadingSpaces = !0)));
		}
		r.isWhitespaceSensitive = s, r.isIndentationSensitive = i;
	});
}
function Za(t) {
	t.walk((e) => {
		e.isSelfClosing = !e.children || e.type === "element" && (e.tagDefinition.isVoid || e.endSourceSpan && e.startSourceSpan.start === e.endSourceSpan.start && e.startSourceSpan.end === e.endSourceSpan.end);
	});
}
function eo(t, e) {
	t.walk((r) => {
		r.type === "element" && (r.hasHtmComponentClosingTag = r.endSourceSpan && /^<\s*\/\s*\/\s*>$/u.test(e.originalText.slice(r.endSourceSpan.start.offset, r.endSourceSpan.end.offset)));
	});
}
function to(t, e) {
	t.walk((r) => {
		r.cssDisplay = Qn(r, e);
	});
}
function ro(t, e) {
	t.walk((r) => {
		let { children: n } = r;
		if (n) {
			if (n.length === 0) {
				r.isDanglingSpaceSensitive = Wn(r, e);
				return;
			}
			for (let s of n) s.isLeadingSpaceSensitive = Vn(s, e), s.isTrailingSpaceSensitive = Un(s, e);
			for (let s = 0; s < n.length; s++) {
				let i = n[s];
				i.isLeadingSpaceSensitive = (s === 0 || i.prev.isTrailingSpaceSensitive) && i.isLeadingSpaceSensitive, i.isTrailingSpaceSensitive = (s === n.length - 1 || i.next.isLeadingSpaceSensitive) && i.isTrailingSpaceSensitive;
			}
		}
	});
}
var Ms = Ga;
function no(t, e, r) {
	let { node: n } = t;
	switch (n.type) {
		case "front-matter": return B(n.raw);
		case "root": return e.__onHtmlRoot && e.__onHtmlRoot(n), [E(Re(t, e, r)), S];
		case "element":
		case "ieConditionalComment": return Is(t, e, r);
		case "angularControlFlowBlock": return Bs(t, e, r);
		case "angularControlFlowBlockParameters": return Fs(t, e, r);
		case "angularControlFlowBlockParameter": return O.trim(n.expression);
		case "angularLetDeclaration": return E([
			"@let ",
			E([
				n.id,
				" =",
				E(k([_, r("init")]))
			]),
			";"
		]);
		case "angularLetDeclarationInitializer": return n.value;
		case "angularIcuExpression": return Ps(t, e, r);
		case "angularIcuCase": return Ns(t, e, r);
		case "ieConditionalStartComment":
		case "ieConditionalEndComment": return [De(n), Se(n)];
		case "interpolation": return [
			De(n, e),
			...t.map(r, "children"),
			Se(n, e)
		];
		case "text": {
			if (n.parent.type === "interpolation") {
				let o = /\n[^\S\n]*$/u, u = o.test(n.value);
				return [B(u ? n.value.replace(o, "") : n.value), u ? S : ""];
			}
			let s = z(n, e), i = kt(n), a = G(n, e);
			return i[0] = [s, i[0]], i.push([i.pop(), a]), vt(i);
		}
		case "docType": return [E([
			De(n, e),
			" ",
			w(!1, n.value.replace(/^html\b/iu, "html"), /\s+/gu, " ")
		]), Se(n, e)];
		case "comment": return [
			z(n, e),
			B(e.originalText.slice(J(n), se(n))),
			G(n, e)
		];
		case "attribute": {
			if (n.value === null) return n.rawName;
			let s = wr(n.value), i = _n(s, "\"");
			return [
				n.rawName,
				"=",
				i,
				B(i === "\"" ? w(!1, s, "\"", "&quot;") : w(!1, s, "'", "&apos;")),
				i
			];
		}
		default: throw new An(n, "HTML");
	}
}
var qs = {
	preprocess: Ms,
	print: no,
	insertPragma: Ts,
	massageAstNode: vn,
	embed: Ss,
	getVisitorKeys: As
};
var Hs = [
	{
		name: "Angular",
		type: "markup",
		extensions: [".component.html"],
		tmScope: "text.html.basic",
		aceMode: "html",
		aliases: ["xhtml"],
		codemirrorMode: "htmlmixed",
		codemirrorMimeType: "text/html",
		parsers: ["angular"],
		vscodeLanguageIds: ["html"],
		filenames: [],
		linguistLanguageId: 146
	},
	{
		name: "HTML",
		type: "markup",
		extensions: [
			".html",
			".hta",
			".htm",
			".html.hl",
			".inc",
			".xht",
			".xhtml"
		],
		tmScope: "text.html.basic",
		aceMode: "html",
		aliases: ["xhtml"],
		codemirrorMode: "htmlmixed",
		codemirrorMimeType: "text/html",
		parsers: ["html"],
		vscodeLanguageIds: ["html"],
		linguistLanguageId: 146
	},
	{
		name: "Lightning Web Components",
		type: "markup",
		extensions: [],
		tmScope: "text.html.basic",
		aceMode: "html",
		aliases: ["xhtml"],
		codemirrorMode: "htmlmixed",
		codemirrorMimeType: "text/html",
		parsers: ["lwc"],
		vscodeLanguageIds: ["html"],
		filenames: [],
		linguistLanguageId: 146
	},
	{
		name: "MJML",
		type: "markup",
		extensions: [".mjml"],
		tmScope: "text.mjml.basic",
		aceMode: "html",
		aliases: ["MJML", "mjml"],
		codemirrorMode: "htmlmixed",
		codemirrorMimeType: "text/html",
		parsers: ["mjml"],
		filenames: [],
		vscodeLanguageIds: ["mjml"],
		linguistLanguageId: 146
	},
	{
		name: "Vue",
		type: "markup",
		extensions: [".vue"],
		tmScope: "source.vue",
		aceMode: "html",
		parsers: ["vue"],
		vscodeLanguageIds: ["vue"],
		linguistLanguageId: 391
	}
];
var Lr = {
	bracketSpacing: {
		category: "Common",
		type: "boolean",
		default: !0,
		description: "Print spaces between brackets.",
		oppositeDescription: "Do not print spaces between brackets."
	},
	objectWrap: {
		category: "Common",
		type: "choice",
		default: "preserve",
		description: "How to wrap object literals.",
		choices: [{
			value: "preserve",
			description: "Keep as multi-line, if there is a newline between the opening brace and first property."
		}, {
			value: "collapse",
			description: "Fit to a single line when possible."
		}]
	},
	singleQuote: {
		category: "Common",
		type: "boolean",
		default: !1,
		description: "Use single quotes instead of double quotes."
	},
	proseWrap: {
		category: "Common",
		type: "choice",
		default: "preserve",
		description: "How to wrap prose.",
		choices: [
			{
				value: "always",
				description: "Wrap prose if it exceeds the print width."
			},
			{
				value: "never",
				description: "Do not wrap prose."
			},
			{
				value: "preserve",
				description: "Wrap prose as-is."
			}
		]
	},
	bracketSameLine: {
		category: "Common",
		type: "boolean",
		default: !1,
		description: "Put > of opening tags on the last line instead of on a new line."
	},
	singleAttributePerLine: {
		category: "Common",
		type: "boolean",
		default: !1,
		description: "Enforce single attribute per line in HTML, Vue and JSX."
	}
};
var Vs = "HTML";
var Us = {
	bracketSameLine: Lr.bracketSameLine,
	htmlWhitespaceSensitivity: {
		category: Vs,
		type: "choice",
		default: "css",
		description: "How to handle whitespaces in HTML.",
		choices: [
			{
				value: "css",
				description: "Respect the default value of CSS display property."
			},
			{
				value: "strict",
				description: "Whitespaces are considered sensitive."
			},
			{
				value: "ignore",
				description: "Whitespaces are considered insensitive."
			}
		]
	},
	singleAttributePerLine: Lr.singleAttributePerLine,
	vueIndentScriptAndStyle: {
		category: Vs,
		type: "boolean",
		default: !1,
		description: "Indent script and style tags in Vue files."
	}
};
var tn = {};
ln(tn, {
	angular: () => iu,
	html: () => ru,
	lwc: () => ou,
	mjml: () => su,
	vue: () => au
});
new RegExp(`(\\:not\\()|(([\\.\\#]?)[-\\w]+)|(?:\\[([-.\\w*\\\\$]+)(?:=(["']?)([^\\]"']*)\\5)?\\])|(\\))|(\\s*,\\s*)`, "g");
var Ws;
(function(t) {
	t[t.Emulated = 0] = "Emulated", t[t.None = 2] = "None", t[t.ShadowDom = 3] = "ShadowDom";
})(Ws || (Ws = {}));
var Gs;
(function(t) {
	t[t.OnPush = 0] = "OnPush", t[t.Default = 1] = "Default";
})(Gs || (Gs = {}));
var zs;
(function(t) {
	t[t.None = 0] = "None", t[t.SignalBased = 1] = "SignalBased", t[t.HasDecoratorInputTransform = 2] = "HasDecoratorInputTransform";
})(zs || (zs = {}));
var Fr = { name: "custom-elements" };
var Pr = { name: "no-errors-schema" };
var Z;
(function(t) {
	t[t.NONE = 0] = "NONE", t[t.HTML = 1] = "HTML", t[t.STYLE = 2] = "STYLE", t[t.SCRIPT = 3] = "SCRIPT", t[t.URL = 4] = "URL", t[t.RESOURCE_URL = 5] = "RESOURCE_URL";
})(Z || (Z = {}));
var Ys;
(function(t) {
	t[t.Error = 0] = "Error", t[t.Warning = 1] = "Warning", t[t.Ignore = 2] = "Ignore";
})(Ys || (Ys = {}));
var N;
(function(t) {
	t[t.RAW_TEXT = 0] = "RAW_TEXT", t[t.ESCAPABLE_RAW_TEXT = 1] = "ESCAPABLE_RAW_TEXT", t[t.PARSABLE_DATA = 2] = "PARSABLE_DATA";
})(N || (N = {}));
function ct(t, e = !0) {
	if (t[0] != ":") return [null, t];
	let r = t.indexOf(":", 1);
	if (r === -1) {
		if (e) throw new Error(`Unsupported format "${t}" expecting ":namespace:name"`);
		return [null, t];
	}
	return [t.slice(1, r), t.slice(r + 1)];
}
function Nr(t) {
	return ct(t)[1] === "ng-container";
}
function Ir(t) {
	return ct(t)[1] === "ng-content";
}
function Me(t) {
	return t === null ? null : ct(t)[0];
}
function qe(t, e) {
	return t ? `:${t}:${e}` : e;
}
var Ht;
function Rr() {
	return Ht || (Ht = {}, qt(Z.HTML, [
		"iframe|srcdoc",
		"*|innerHTML",
		"*|outerHTML"
	]), qt(Z.STYLE, ["*|style"]), qt(Z.URL, [
		"*|formAction",
		"area|href",
		"area|ping",
		"audio|src",
		"a|href",
		"a|ping",
		"blockquote|cite",
		"body|background",
		"del|cite",
		"form|action",
		"img|src",
		"input|src",
		"ins|cite",
		"q|cite",
		"source|src",
		"track|src",
		"video|poster",
		"video|src"
	]), qt(Z.RESOURCE_URL, [
		"applet|code",
		"applet|codebase",
		"base|href",
		"embed|src",
		"frame|src",
		"head|profile",
		"html|manifest",
		"iframe|src",
		"link|href",
		"media|src",
		"object|codebase",
		"object|data",
		"script|src"
	])), Ht;
}
function qt(t, e) {
	for (let r of e) Ht[r.toLowerCase()] = t;
}
var Vt = class {};
var ao = "boolean";
var oo = "number";
var uo = "string";
var lo = "object";
var co = [
	"[Element]|textContent,%ariaAtomic,%ariaAutoComplete,%ariaBusy,%ariaChecked,%ariaColCount,%ariaColIndex,%ariaColSpan,%ariaCurrent,%ariaDescription,%ariaDisabled,%ariaExpanded,%ariaHasPopup,%ariaHidden,%ariaKeyShortcuts,%ariaLabel,%ariaLevel,%ariaLive,%ariaModal,%ariaMultiLine,%ariaMultiSelectable,%ariaOrientation,%ariaPlaceholder,%ariaPosInSet,%ariaPressed,%ariaReadOnly,%ariaRelevant,%ariaRequired,%ariaRoleDescription,%ariaRowCount,%ariaRowIndex,%ariaRowSpan,%ariaSelected,%ariaSetSize,%ariaSort,%ariaValueMax,%ariaValueMin,%ariaValueNow,%ariaValueText,%classList,className,elementTiming,id,innerHTML,*beforecopy,*beforecut,*beforepaste,*fullscreenchange,*fullscreenerror,*search,*webkitfullscreenchange,*webkitfullscreenerror,outerHTML,%part,#scrollLeft,#scrollTop,slot,*message,*mozfullscreenchange,*mozfullscreenerror,*mozpointerlockchange,*mozpointerlockerror,*webglcontextcreationerror,*webglcontextlost,*webglcontextrestored",
	"[HTMLElement]^[Element]|accessKey,autocapitalize,!autofocus,contentEditable,dir,!draggable,enterKeyHint,!hidden,!inert,innerText,inputMode,lang,nonce,*abort,*animationend,*animationiteration,*animationstart,*auxclick,*beforexrselect,*blur,*cancel,*canplay,*canplaythrough,*change,*click,*close,*contextmenu,*copy,*cuechange,*cut,*dblclick,*drag,*dragend,*dragenter,*dragleave,*dragover,*dragstart,*drop,*durationchange,*emptied,*ended,*error,*focus,*formdata,*gotpointercapture,*input,*invalid,*keydown,*keypress,*keyup,*load,*loadeddata,*loadedmetadata,*loadstart,*lostpointercapture,*mousedown,*mouseenter,*mouseleave,*mousemove,*mouseout,*mouseover,*mouseup,*mousewheel,*paste,*pause,*play,*playing,*pointercancel,*pointerdown,*pointerenter,*pointerleave,*pointermove,*pointerout,*pointerover,*pointerrawupdate,*pointerup,*progress,*ratechange,*reset,*resize,*scroll,*securitypolicyviolation,*seeked,*seeking,*select,*selectionchange,*selectstart,*slotchange,*stalled,*submit,*suspend,*timeupdate,*toggle,*transitioncancel,*transitionend,*transitionrun,*transitionstart,*volumechange,*waiting,*webkitanimationend,*webkitanimationiteration,*webkitanimationstart,*webkittransitionend,*wheel,outerText,!spellcheck,%style,#tabIndex,title,!translate,virtualKeyboardPolicy",
	"abbr,address,article,aside,b,bdi,bdo,cite,content,code,dd,dfn,dt,em,figcaption,figure,footer,header,hgroup,i,kbd,main,mark,nav,noscript,rb,rp,rt,rtc,ruby,s,samp,section,small,strong,sub,sup,u,var,wbr^[HTMLElement]|accessKey,autocapitalize,!autofocus,contentEditable,dir,!draggable,enterKeyHint,!hidden,innerText,inputMode,lang,nonce,*abort,*animationend,*animationiteration,*animationstart,*auxclick,*beforexrselect,*blur,*cancel,*canplay,*canplaythrough,*change,*click,*close,*contextmenu,*copy,*cuechange,*cut,*dblclick,*drag,*dragend,*dragenter,*dragleave,*dragover,*dragstart,*drop,*durationchange,*emptied,*ended,*error,*focus,*formdata,*gotpointercapture,*input,*invalid,*keydown,*keypress,*keyup,*load,*loadeddata,*loadedmetadata,*loadstart,*lostpointercapture,*mousedown,*mouseenter,*mouseleave,*mousemove,*mouseout,*mouseover,*mouseup,*mousewheel,*paste,*pause,*play,*playing,*pointercancel,*pointerdown,*pointerenter,*pointerleave,*pointermove,*pointerout,*pointerover,*pointerrawupdate,*pointerup,*progress,*ratechange,*reset,*resize,*scroll,*securitypolicyviolation,*seeked,*seeking,*select,*selectionchange,*selectstart,*slotchange,*stalled,*submit,*suspend,*timeupdate,*toggle,*transitioncancel,*transitionend,*transitionrun,*transitionstart,*volumechange,*waiting,*webkitanimationend,*webkitanimationiteration,*webkitanimationstart,*webkittransitionend,*wheel,outerText,!spellcheck,%style,#tabIndex,title,!translate,virtualKeyboardPolicy",
	"media^[HTMLElement]|!autoplay,!controls,%controlsList,%crossOrigin,#currentTime,!defaultMuted,#defaultPlaybackRate,!disableRemotePlayback,!loop,!muted,*encrypted,*waitingforkey,#playbackRate,preload,!preservesPitch,src,%srcObject,#volume",
	":svg:^[HTMLElement]|!autofocus,nonce,*abort,*animationend,*animationiteration,*animationstart,*auxclick,*beforexrselect,*blur,*cancel,*canplay,*canplaythrough,*change,*click,*close,*contextmenu,*copy,*cuechange,*cut,*dblclick,*drag,*dragend,*dragenter,*dragleave,*dragover,*dragstart,*drop,*durationchange,*emptied,*ended,*error,*focus,*formdata,*gotpointercapture,*input,*invalid,*keydown,*keypress,*keyup,*load,*loadeddata,*loadedmetadata,*loadstart,*lostpointercapture,*mousedown,*mouseenter,*mouseleave,*mousemove,*mouseout,*mouseover,*mouseup,*mousewheel,*paste,*pause,*play,*playing,*pointercancel,*pointerdown,*pointerenter,*pointerleave,*pointermove,*pointerout,*pointerover,*pointerrawupdate,*pointerup,*progress,*ratechange,*reset,*resize,*scroll,*securitypolicyviolation,*seeked,*seeking,*select,*selectionchange,*selectstart,*slotchange,*stalled,*submit,*suspend,*timeupdate,*toggle,*transitioncancel,*transitionend,*transitionrun,*transitionstart,*volumechange,*waiting,*webkitanimationend,*webkitanimationiteration,*webkitanimationstart,*webkittransitionend,*wheel,%style,#tabIndex",
	":svg:graphics^:svg:|",
	":svg:animation^:svg:|*begin,*end,*repeat",
	":svg:geometry^:svg:|",
	":svg:componentTransferFunction^:svg:|",
	":svg:gradient^:svg:|",
	":svg:textContent^:svg:graphics|",
	":svg:textPositioning^:svg:textContent|",
	"a^[HTMLElement]|charset,coords,download,hash,host,hostname,href,hreflang,name,password,pathname,ping,port,protocol,referrerPolicy,rel,%relList,rev,search,shape,target,text,type,username",
	"area^[HTMLElement]|alt,coords,download,hash,host,hostname,href,!noHref,password,pathname,ping,port,protocol,referrerPolicy,rel,%relList,search,shape,target,username",
	"audio^media|",
	"br^[HTMLElement]|clear",
	"base^[HTMLElement]|href,target",
	"body^[HTMLElement]|aLink,background,bgColor,link,*afterprint,*beforeprint,*beforeunload,*blur,*error,*focus,*hashchange,*languagechange,*load,*message,*messageerror,*offline,*online,*pagehide,*pageshow,*popstate,*rejectionhandled,*resize,*scroll,*storage,*unhandledrejection,*unload,text,vLink",
	"button^[HTMLElement]|!disabled,formAction,formEnctype,formMethod,!formNoValidate,formTarget,name,type,value",
	"canvas^[HTMLElement]|#height,#width",
	"content^[HTMLElement]|select",
	"dl^[HTMLElement]|!compact",
	"data^[HTMLElement]|value",
	"datalist^[HTMLElement]|",
	"details^[HTMLElement]|!open",
	"dialog^[HTMLElement]|!open,returnValue",
	"dir^[HTMLElement]|!compact",
	"div^[HTMLElement]|align",
	"embed^[HTMLElement]|align,height,name,src,type,width",
	"fieldset^[HTMLElement]|!disabled,name",
	"font^[HTMLElement]|color,face,size",
	"form^[HTMLElement]|acceptCharset,action,autocomplete,encoding,enctype,method,name,!noValidate,target",
	"frame^[HTMLElement]|frameBorder,longDesc,marginHeight,marginWidth,name,!noResize,scrolling,src",
	"frameset^[HTMLElement]|cols,*afterprint,*beforeprint,*beforeunload,*blur,*error,*focus,*hashchange,*languagechange,*load,*message,*messageerror,*offline,*online,*pagehide,*pageshow,*popstate,*rejectionhandled,*resize,*scroll,*storage,*unhandledrejection,*unload,rows",
	"hr^[HTMLElement]|align,color,!noShade,size,width",
	"head^[HTMLElement]|",
	"h1,h2,h3,h4,h5,h6^[HTMLElement]|align",
	"html^[HTMLElement]|version",
	"iframe^[HTMLElement]|align,allow,!allowFullscreen,!allowPaymentRequest,csp,frameBorder,height,loading,longDesc,marginHeight,marginWidth,name,referrerPolicy,%sandbox,scrolling,src,srcdoc,width",
	"img^[HTMLElement]|align,alt,border,%crossOrigin,decoding,#height,#hspace,!isMap,loading,longDesc,lowsrc,name,referrerPolicy,sizes,src,srcset,useMap,#vspace,#width",
	"input^[HTMLElement]|accept,align,alt,autocomplete,!checked,!defaultChecked,defaultValue,dirName,!disabled,%files,formAction,formEnctype,formMethod,!formNoValidate,formTarget,#height,!incremental,!indeterminate,max,#maxLength,min,#minLength,!multiple,name,pattern,placeholder,!readOnly,!required,selectionDirection,#selectionEnd,#selectionStart,#size,src,step,type,useMap,value,%valueAsDate,#valueAsNumber,#width",
	"li^[HTMLElement]|type,#value",
	"label^[HTMLElement]|htmlFor",
	"legend^[HTMLElement]|align",
	"link^[HTMLElement]|as,charset,%crossOrigin,!disabled,href,hreflang,imageSizes,imageSrcset,integrity,media,referrerPolicy,rel,%relList,rev,%sizes,target,type",
	"map^[HTMLElement]|name",
	"marquee^[HTMLElement]|behavior,bgColor,direction,height,#hspace,#loop,#scrollAmount,#scrollDelay,!trueSpeed,#vspace,width",
	"menu^[HTMLElement]|!compact",
	"meta^[HTMLElement]|content,httpEquiv,media,name,scheme",
	"meter^[HTMLElement]|#high,#low,#max,#min,#optimum,#value",
	"ins,del^[HTMLElement]|cite,dateTime",
	"ol^[HTMLElement]|!compact,!reversed,#start,type",
	"object^[HTMLElement]|align,archive,border,code,codeBase,codeType,data,!declare,height,#hspace,name,standby,type,useMap,#vspace,width",
	"optgroup^[HTMLElement]|!disabled,label",
	"option^[HTMLElement]|!defaultSelected,!disabled,label,!selected,text,value",
	"output^[HTMLElement]|defaultValue,%htmlFor,name,value",
	"p^[HTMLElement]|align",
	"param^[HTMLElement]|name,type,value,valueType",
	"picture^[HTMLElement]|",
	"pre^[HTMLElement]|#width",
	"progress^[HTMLElement]|#max,#value",
	"q,blockquote,cite^[HTMLElement]|",
	"script^[HTMLElement]|!async,charset,%crossOrigin,!defer,event,htmlFor,integrity,!noModule,%referrerPolicy,src,text,type",
	"select^[HTMLElement]|autocomplete,!disabled,#length,!multiple,name,!required,#selectedIndex,#size,value",
	"slot^[HTMLElement]|name",
	"source^[HTMLElement]|#height,media,sizes,src,srcset,type,#width",
	"span^[HTMLElement]|",
	"style^[HTMLElement]|!disabled,media,type",
	"caption^[HTMLElement]|align",
	"th,td^[HTMLElement]|abbr,align,axis,bgColor,ch,chOff,#colSpan,headers,height,!noWrap,#rowSpan,scope,vAlign,width",
	"col,colgroup^[HTMLElement]|align,ch,chOff,#span,vAlign,width",
	"table^[HTMLElement]|align,bgColor,border,%caption,cellPadding,cellSpacing,frame,rules,summary,%tFoot,%tHead,width",
	"tr^[HTMLElement]|align,bgColor,ch,chOff,vAlign",
	"tfoot,thead,tbody^[HTMLElement]|align,ch,chOff,vAlign",
	"template^[HTMLElement]|",
	"textarea^[HTMLElement]|autocomplete,#cols,defaultValue,dirName,!disabled,#maxLength,#minLength,name,placeholder,!readOnly,!required,#rows,selectionDirection,#selectionEnd,#selectionStart,value,wrap",
	"time^[HTMLElement]|dateTime",
	"title^[HTMLElement]|text",
	"track^[HTMLElement]|!default,kind,label,src,srclang",
	"ul^[HTMLElement]|!compact,type",
	"unknown^[HTMLElement]|",
	"video^media|!disablePictureInPicture,#height,*enterpictureinpicture,*leavepictureinpicture,!playsInline,poster,#width",
	":svg:a^:svg:graphics|",
	":svg:animate^:svg:animation|",
	":svg:animateMotion^:svg:animation|",
	":svg:animateTransform^:svg:animation|",
	":svg:circle^:svg:geometry|",
	":svg:clipPath^:svg:graphics|",
	":svg:defs^:svg:graphics|",
	":svg:desc^:svg:|",
	":svg:discard^:svg:|",
	":svg:ellipse^:svg:geometry|",
	":svg:feBlend^:svg:|",
	":svg:feColorMatrix^:svg:|",
	":svg:feComponentTransfer^:svg:|",
	":svg:feComposite^:svg:|",
	":svg:feConvolveMatrix^:svg:|",
	":svg:feDiffuseLighting^:svg:|",
	":svg:feDisplacementMap^:svg:|",
	":svg:feDistantLight^:svg:|",
	":svg:feDropShadow^:svg:|",
	":svg:feFlood^:svg:|",
	":svg:feFuncA^:svg:componentTransferFunction|",
	":svg:feFuncB^:svg:componentTransferFunction|",
	":svg:feFuncG^:svg:componentTransferFunction|",
	":svg:feFuncR^:svg:componentTransferFunction|",
	":svg:feGaussianBlur^:svg:|",
	":svg:feImage^:svg:|",
	":svg:feMerge^:svg:|",
	":svg:feMergeNode^:svg:|",
	":svg:feMorphology^:svg:|",
	":svg:feOffset^:svg:|",
	":svg:fePointLight^:svg:|",
	":svg:feSpecularLighting^:svg:|",
	":svg:feSpotLight^:svg:|",
	":svg:feTile^:svg:|",
	":svg:feTurbulence^:svg:|",
	":svg:filter^:svg:|",
	":svg:foreignObject^:svg:graphics|",
	":svg:g^:svg:graphics|",
	":svg:image^:svg:graphics|decoding",
	":svg:line^:svg:geometry|",
	":svg:linearGradient^:svg:gradient|",
	":svg:mpath^:svg:|",
	":svg:marker^:svg:|",
	":svg:mask^:svg:|",
	":svg:metadata^:svg:|",
	":svg:path^:svg:geometry|",
	":svg:pattern^:svg:|",
	":svg:polygon^:svg:geometry|",
	":svg:polyline^:svg:geometry|",
	":svg:radialGradient^:svg:gradient|",
	":svg:rect^:svg:geometry|",
	":svg:svg^:svg:graphics|#currentScale,#zoomAndPan",
	":svg:script^:svg:|type",
	":svg:set^:svg:animation|",
	":svg:stop^:svg:|",
	":svg:style^:svg:|!disabled,media,title,type",
	":svg:switch^:svg:graphics|",
	":svg:symbol^:svg:|",
	":svg:tspan^:svg:textPositioning|",
	":svg:text^:svg:textPositioning|",
	":svg:textPath^:svg:textContent|",
	":svg:title^:svg:|",
	":svg:use^:svg:graphics|",
	":svg:view^:svg:|#zoomAndPan",
	"data^[HTMLElement]|value",
	"keygen^[HTMLElement]|!autofocus,challenge,!disabled,form,keytype,name",
	"menuitem^[HTMLElement]|type,label,icon,!disabled,!checked,radiogroup,!default",
	"summary^[HTMLElement]|",
	"time^[HTMLElement]|dateTime",
	":svg:cursor^:svg:|",
	":math:^[HTMLElement]|!autofocus,nonce,*abort,*animationend,*animationiteration,*animationstart,*auxclick,*beforeinput,*beforematch,*beforetoggle,*beforexrselect,*blur,*cancel,*canplay,*canplaythrough,*change,*click,*close,*contentvisibilityautostatechange,*contextlost,*contextmenu,*contextrestored,*copy,*cuechange,*cut,*dblclick,*drag,*dragend,*dragenter,*dragleave,*dragover,*dragstart,*drop,*durationchange,*emptied,*ended,*error,*focus,*formdata,*gotpointercapture,*input,*invalid,*keydown,*keypress,*keyup,*load,*loadeddata,*loadedmetadata,*loadstart,*lostpointercapture,*mousedown,*mouseenter,*mouseleave,*mousemove,*mouseout,*mouseover,*mouseup,*mousewheel,*paste,*pause,*play,*playing,*pointercancel,*pointerdown,*pointerenter,*pointerleave,*pointermove,*pointerout,*pointerover,*pointerrawupdate,*pointerup,*progress,*ratechange,*reset,*resize,*scroll,*scrollend,*securitypolicyviolation,*seeked,*seeking,*select,*selectionchange,*selectstart,*slotchange,*stalled,*submit,*suspend,*timeupdate,*toggle,*transitioncancel,*transitionend,*transitionrun,*transitionstart,*volumechange,*waiting,*webkitanimationend,*webkitanimationiteration,*webkitanimationstart,*webkittransitionend,*wheel,%style,#tabIndex",
	":math:math^:math:|",
	":math:maction^:math:|",
	":math:menclose^:math:|",
	":math:merror^:math:|",
	":math:mfenced^:math:|",
	":math:mfrac^:math:|",
	":math:mi^:math:|",
	":math:mmultiscripts^:math:|",
	":math:mn^:math:|",
	":math:mo^:math:|",
	":math:mover^:math:|",
	":math:mpadded^:math:|",
	":math:mphantom^:math:|",
	":math:mroot^:math:|",
	":math:mrow^:math:|",
	":math:ms^:math:|",
	":math:mspace^:math:|",
	":math:msqrt^:math:|",
	":math:mstyle^:math:|",
	":math:msub^:math:|",
	":math:msubsup^:math:|",
	":math:msup^:math:|",
	":math:mtable^:math:|",
	":math:mtd^:math:|",
	":math:mtext^:math:|",
	":math:mtr^:math:|",
	":math:munder^:math:|",
	":math:munderover^:math:|",
	":math:semantics^:math:|"
];
var js = new Map(Object.entries({
	class: "className",
	for: "htmlFor",
	formaction: "formAction",
	innerHtml: "innerHTML",
	readonly: "readOnly",
	tabindex: "tabIndex"
}));
var po = Array.from(js).reduce((t, [e, r]) => (t.set(e, r), t), /* @__PURE__ */ new Map());
var Ut = class extends Vt {
	constructor() {
		super(), this._schema = /* @__PURE__ */ new Map(), this._eventSchema = /* @__PURE__ */ new Map(), co.forEach((e) => {
			let r = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Set(), [s, i] = e.split("|"), a = i.split(","), [o, u] = s.split("^");
			o.split(",").forEach((l) => {
				this._schema.set(l.toLowerCase(), r), this._eventSchema.set(l.toLowerCase(), n);
			});
			let p = u && this._schema.get(u.toLowerCase());
			if (p) {
				for (let [l, m] of p) r.set(l, m);
				for (let l of this._eventSchema.get(u.toLowerCase())) n.add(l);
			}
			a.forEach((l) => {
				if (l.length > 0) switch (l[0]) {
					case "*":
						n.add(l.substring(1));
						break;
					case "!":
						r.set(l.substring(1), ao);
						break;
					case "#":
						r.set(l.substring(1), oo);
						break;
					case "%":
						r.set(l.substring(1), lo);
						break;
					default: r.set(l, uo);
				}
			});
		});
	}
	hasProperty(e, r, n) {
		if (n.some((i) => i.name === Pr.name)) return !0;
		if (e.indexOf("-") > -1) {
			if (Nr(e) || Ir(e)) return !1;
			if (n.some((i) => i.name === Fr.name)) return !0;
		}
		return (this._schema.get(e.toLowerCase()) || this._schema.get("unknown")).has(r);
	}
	hasElement(e, r) {
		return r.some((n) => n.name === Pr.name) || e.indexOf("-") > -1 && (Nr(e) || Ir(e) || r.some((n) => n.name === Fr.name)) ? !0 : this._schema.has(e.toLowerCase());
	}
	securityContext(e, r, n) {
		n && (r = this.getMappedPropName(r)), e = e.toLowerCase(), r = r.toLowerCase();
		let s = Rr()[e + "|" + r];
		return s || (s = Rr()["*|" + r], s || Z.NONE);
	}
	getMappedPropName(e) {
		return js.get(e) ?? e;
	}
	getDefaultComponentElementName() {
		return "ng-component";
	}
	validateProperty(e) {
		return e.toLowerCase().startsWith("on") ? {
			error: !0,
			msg: `Binding to event property '${e}' is disallowed for security reasons, please use (${e.slice(2)})=...
If '${e}' is a directive input, make sure the directive is imported by the current module.`
		} : { error: !1 };
	}
	validateAttribute(e) {
		return e.toLowerCase().startsWith("on") ? {
			error: !0,
			msg: `Binding to event attribute '${e}' is disallowed for security reasons, please use (${e.slice(2)})=...`
		} : { error: !1 };
	}
	allKnownElementNames() {
		return Array.from(this._schema.keys());
	}
	allKnownAttributesOfElement(e) {
		let r = this._schema.get(e.toLowerCase()) || this._schema.get("unknown");
		return Array.from(r.keys()).map((n) => po.get(n) ?? n);
	}
	allKnownEventsOfElement(e) {
		return Array.from(this._eventSchema.get(e.toLowerCase()) ?? []);
	}
	normalizeAnimationStyleProperty(e) {
		return Os(e);
	}
	normalizeAnimationStyleValue(e, r, n) {
		let s = "", i = n.toString().trim(), a = null;
		if (ho(e) && n !== 0 && n !== "0") if (typeof n == "number") s = "px";
		else {
			let o = n.match(/^[+-]?[\d\.]+([a-z]*)$/);
			o && o[1].length == 0 && (a = `Please provide a CSS unit value for ${r}:${n}`);
		}
		return {
			error: a,
			value: i + s
		};
	}
};
function ho(t) {
	switch (t) {
		case "width":
		case "height":
		case "minWidth":
		case "minHeight":
		case "maxWidth":
		case "maxHeight":
		case "left":
		case "top":
		case "bottom":
		case "right":
		case "fontSize":
		case "outlineWidth":
		case "outlineOffset":
		case "paddingTop":
		case "paddingLeft":
		case "paddingBottom":
		case "paddingRight":
		case "marginTop":
		case "marginLeft":
		case "marginBottom":
		case "marginRight":
		case "borderRadius":
		case "borderWidth":
		case "borderTopWidth":
		case "borderLeftWidth":
		case "borderRightWidth":
		case "borderBottomWidth":
		case "textIndent": return !0;
		default: return !1;
	}
}
var d = class {
	constructor({ closedByChildren: e, implicitNamespacePrefix: r, contentType: n = N.PARSABLE_DATA, closedByParent: s = !1, isVoid: i = !1, ignoreFirstLf: a = !1, preventNamespaceInheritance: o = !1, canSelfClose: u = !1 } = {}) {
		this.closedByChildren = {}, this.closedByParent = !1, e && e.length > 0 && e.forEach((p) => this.closedByChildren[p] = !0), this.isVoid = i, this.closedByParent = s || i, this.implicitNamespacePrefix = r || null, this.contentType = n, this.ignoreFirstLf = a, this.preventNamespaceInheritance = o, this.canSelfClose = u ?? i;
	}
	isClosedByChild(e) {
		return this.isVoid || e.toLowerCase() in this.closedByChildren;
	}
	getContentType(e) {
		return typeof this.contentType == "object" ? (e === void 0 ? void 0 : this.contentType[e]) ?? this.contentType.default : this.contentType;
	}
};
var Ks;
var pt;
function He(t) {
	return pt || (Ks = new d({ canSelfClose: !0 }), pt = Object.assign(Object.create(null), {
		base: new d({ isVoid: !0 }),
		meta: new d({ isVoid: !0 }),
		area: new d({ isVoid: !0 }),
		embed: new d({ isVoid: !0 }),
		link: new d({ isVoid: !0 }),
		img: new d({ isVoid: !0 }),
		input: new d({ isVoid: !0 }),
		param: new d({ isVoid: !0 }),
		hr: new d({ isVoid: !0 }),
		br: new d({ isVoid: !0 }),
		source: new d({ isVoid: !0 }),
		track: new d({ isVoid: !0 }),
		wbr: new d({ isVoid: !0 }),
		p: new d({
			closedByChildren: [
				"address",
				"article",
				"aside",
				"blockquote",
				"div",
				"dl",
				"fieldset",
				"footer",
				"form",
				"h1",
				"h2",
				"h3",
				"h4",
				"h5",
				"h6",
				"header",
				"hgroup",
				"hr",
				"main",
				"nav",
				"ol",
				"p",
				"pre",
				"section",
				"table",
				"ul"
			],
			closedByParent: !0
		}),
		thead: new d({ closedByChildren: ["tbody", "tfoot"] }),
		tbody: new d({
			closedByChildren: ["tbody", "tfoot"],
			closedByParent: !0
		}),
		tfoot: new d({
			closedByChildren: ["tbody"],
			closedByParent: !0
		}),
		tr: new d({
			closedByChildren: ["tr"],
			closedByParent: !0
		}),
		td: new d({
			closedByChildren: ["td", "th"],
			closedByParent: !0
		}),
		th: new d({
			closedByChildren: ["td", "th"],
			closedByParent: !0
		}),
		col: new d({ isVoid: !0 }),
		svg: new d({ implicitNamespacePrefix: "svg" }),
		foreignObject: new d({
			implicitNamespacePrefix: "svg",
			preventNamespaceInheritance: !0
		}),
		math: new d({ implicitNamespacePrefix: "math" }),
		li: new d({
			closedByChildren: ["li"],
			closedByParent: !0
		}),
		dt: new d({ closedByChildren: ["dt", "dd"] }),
		dd: new d({
			closedByChildren: ["dt", "dd"],
			closedByParent: !0
		}),
		rb: new d({
			closedByChildren: [
				"rb",
				"rt",
				"rtc",
				"rp"
			],
			closedByParent: !0
		}),
		rt: new d({
			closedByChildren: [
				"rb",
				"rt",
				"rtc",
				"rp"
			],
			closedByParent: !0
		}),
		rtc: new d({
			closedByChildren: [
				"rb",
				"rtc",
				"rp"
			],
			closedByParent: !0
		}),
		rp: new d({
			closedByChildren: [
				"rb",
				"rt",
				"rtc",
				"rp"
			],
			closedByParent: !0
		}),
		optgroup: new d({
			closedByChildren: ["optgroup"],
			closedByParent: !0
		}),
		option: new d({
			closedByChildren: ["option", "optgroup"],
			closedByParent: !0
		}),
		pre: new d({ ignoreFirstLf: !0 }),
		listing: new d({ ignoreFirstLf: !0 }),
		style: new d({ contentType: N.RAW_TEXT }),
		script: new d({ contentType: N.RAW_TEXT }),
		title: new d({ contentType: {
			default: N.ESCAPABLE_RAW_TEXT,
			svg: N.PARSABLE_DATA
		} }),
		textarea: new d({
			contentType: N.ESCAPABLE_RAW_TEXT,
			ignoreFirstLf: !0
		})
	}), new Ut().allKnownElementNames().forEach((e) => {
		!pt[e] && Me(e) === null && (pt[e] = new d({ canSelfClose: !1 }));
	})), pt[t] ?? Ks;
}
var ae = class {
	constructor(e, r) {
		this.sourceSpan = e, this.i18n = r;
	}
};
var Wt = class extends ae {
	constructor(e, r, n, s) {
		super(r, s), this.value = e, this.tokens = n, this.type = "text";
	}
	visit(e, r) {
		return e.visitText(this, r);
	}
};
var Gt = class extends ae {
	constructor(e, r, n, s) {
		super(r, s), this.value = e, this.tokens = n, this.type = "cdata";
	}
	visit(e, r) {
		return e.visitCdata(this, r);
	}
};
var zt = class extends ae {
	constructor(e, r, n, s, i, a) {
		super(s, a), this.switchValue = e, this.type = r, this.cases = n, this.switchValueSourceSpan = i;
	}
	visit(e, r) {
		return e.visitExpansion(this, r);
	}
};
var Yt = class {
	constructor(e, r, n, s, i) {
		this.value = e, this.expression = r, this.sourceSpan = n, this.valueSourceSpan = s, this.expSourceSpan = i, this.type = "expansionCase";
	}
	visit(e, r) {
		return e.visitExpansionCase(this, r);
	}
};
var jt = class extends ae {
	constructor(e, r, n, s, i, a, o) {
		super(n, o), this.name = e, this.value = r, this.keySpan = s, this.valueSpan = i, this.valueTokens = a, this.type = "attribute";
	}
	visit(e, r) {
		return e.visitAttribute(this, r);
	}
	get nameSpan() {
		return this.keySpan;
	}
};
var Y = class extends ae {
	constructor(e, r, n, s, i, a = null, o = null, u) {
		super(s, u), this.name = e, this.attrs = r, this.children = n, this.startSourceSpan = i, this.endSourceSpan = a, this.nameSpan = o, this.type = "element";
	}
	visit(e, r) {
		return e.visitElement(this, r);
	}
};
var Kt = class {
	constructor(e, r) {
		this.value = e, this.sourceSpan = r, this.type = "comment";
	}
	visit(e, r) {
		return e.visitComment(this, r);
	}
};
var Xt = class {
	constructor(e, r) {
		this.value = e, this.sourceSpan = r, this.type = "docType";
	}
	visit(e, r) {
		return e.visitDocType(this, r);
	}
};
var ee = class extends ae {
	constructor(e, r, n, s, i, a, o = null, u) {
		super(s, u), this.name = e, this.parameters = r, this.children = n, this.nameSpan = i, this.startSourceSpan = a, this.endSourceSpan = o, this.type = "block";
	}
	visit(e, r) {
		return e.visitBlock(this, r);
	}
};
var ht = class {
	constructor(e, r) {
		this.expression = e, this.sourceSpan = r, this.type = "blockParameter", this.startSourceSpan = null, this.endSourceSpan = null;
	}
	visit(e, r) {
		return e.visitBlockParameter(this, r);
	}
};
var mt = class {
	constructor(e, r, n, s, i) {
		this.name = e, this.value = r, this.sourceSpan = n, this.nameSpan = s, this.valueSpan = i, this.type = "letDeclaration", this.startSourceSpan = null, this.endSourceSpan = null;
	}
	visit(e, r) {
		return e.visitLetDeclaration(this, r);
	}
};
function Qt(t, e, r = null) {
	let n = [], s = t.visit ? (i) => t.visit(i, r) || i.visit(t, r) : (i) => i.visit(t, r);
	return e.forEach((i) => {
		let a = s(i);
		a && n.push(a);
	}), n;
}
var ft = class {
	constructor() {}
	visitElement(e, r) {
		this.visitChildren(r, (n) => {
			n(e.attrs), n(e.children);
		});
	}
	visitAttribute(e, r) {}
	visitText(e, r) {}
	visitCdata(e, r) {}
	visitComment(e, r) {}
	visitDocType(e, r) {}
	visitExpansion(e, r) {
		return this.visitChildren(r, (n) => {
			n(e.cases);
		});
	}
	visitExpansionCase(e, r) {}
	visitBlock(e, r) {
		this.visitChildren(r, (n) => {
			n(e.parameters), n(e.children);
		});
	}
	visitBlockParameter(e, r) {}
	visitLetDeclaration(e, r) {}
	visitChildren(e, r) {
		let n = [], s = this;
		function i(a) {
			a && n.push(Qt(s, a, e));
		}
		return r(i), Array.prototype.concat.apply([], n);
	}
};
var Ve = {
	AElig: "Æ",
	AMP: "&",
	amp: "&",
	Aacute: "Á",
	Abreve: "Ă",
	Acirc: "Â",
	Acy: "А",
	Afr: "𝔄",
	Agrave: "À",
	Alpha: "Α",
	Amacr: "Ā",
	And: "⩓",
	Aogon: "Ą",
	Aopf: "𝔸",
	ApplyFunction: "⁡",
	af: "⁡",
	Aring: "Å",
	angst: "Å",
	Ascr: "𝒜",
	Assign: "≔",
	colone: "≔",
	coloneq: "≔",
	Atilde: "Ã",
	Auml: "Ä",
	Backslash: "∖",
	setminus: "∖",
	setmn: "∖",
	smallsetminus: "∖",
	ssetmn: "∖",
	Barv: "⫧",
	Barwed: "⌆",
	doublebarwedge: "⌆",
	Bcy: "Б",
	Because: "∵",
	becaus: "∵",
	because: "∵",
	Bernoullis: "ℬ",
	Bscr: "ℬ",
	bernou: "ℬ",
	Beta: "Β",
	Bfr: "𝔅",
	Bopf: "𝔹",
	Breve: "˘",
	breve: "˘",
	Bumpeq: "≎",
	HumpDownHump: "≎",
	bump: "≎",
	CHcy: "Ч",
	COPY: "©",
	copy: "©",
	Cacute: "Ć",
	Cap: "⋒",
	CapitalDifferentialD: "ⅅ",
	DD: "ⅅ",
	Cayleys: "ℭ",
	Cfr: "ℭ",
	Ccaron: "Č",
	Ccedil: "Ç",
	Ccirc: "Ĉ",
	Cconint: "∰",
	Cdot: "Ċ",
	Cedilla: "¸",
	cedil: "¸",
	CenterDot: "·",
	centerdot: "·",
	middot: "·",
	Chi: "Χ",
	CircleDot: "⊙",
	odot: "⊙",
	CircleMinus: "⊖",
	ominus: "⊖",
	CirclePlus: "⊕",
	oplus: "⊕",
	CircleTimes: "⊗",
	otimes: "⊗",
	ClockwiseContourIntegral: "∲",
	cwconint: "∲",
	CloseCurlyDoubleQuote: "”",
	rdquo: "”",
	rdquor: "”",
	CloseCurlyQuote: "’",
	rsquo: "’",
	rsquor: "’",
	Colon: "∷",
	Proportion: "∷",
	Colone: "⩴",
	Congruent: "≡",
	equiv: "≡",
	Conint: "∯",
	DoubleContourIntegral: "∯",
	ContourIntegral: "∮",
	conint: "∮",
	oint: "∮",
	Copf: "ℂ",
	complexes: "ℂ",
	Coproduct: "∐",
	coprod: "∐",
	CounterClockwiseContourIntegral: "∳",
	awconint: "∳",
	Cross: "⨯",
	Cscr: "𝒞",
	Cup: "⋓",
	CupCap: "≍",
	asympeq: "≍",
	DDotrahd: "⤑",
	DJcy: "Ђ",
	DScy: "Ѕ",
	DZcy: "Џ",
	Dagger: "‡",
	ddagger: "‡",
	Darr: "↡",
	Dashv: "⫤",
	DoubleLeftTee: "⫤",
	Dcaron: "Ď",
	Dcy: "Д",
	Del: "∇",
	nabla: "∇",
	Delta: "Δ",
	Dfr: "𝔇",
	DiacriticalAcute: "´",
	acute: "´",
	DiacriticalDot: "˙",
	dot: "˙",
	DiacriticalDoubleAcute: "˝",
	dblac: "˝",
	DiacriticalGrave: "`",
	grave: "`",
	DiacriticalTilde: "˜",
	tilde: "˜",
	Diamond: "⋄",
	diam: "⋄",
	diamond: "⋄",
	DifferentialD: "ⅆ",
	dd: "ⅆ",
	Dopf: "𝔻",
	Dot: "¨",
	DoubleDot: "¨",
	die: "¨",
	uml: "¨",
	DotDot: "⃜",
	DotEqual: "≐",
	doteq: "≐",
	esdot: "≐",
	DoubleDownArrow: "⇓",
	Downarrow: "⇓",
	dArr: "⇓",
	DoubleLeftArrow: "⇐",
	Leftarrow: "⇐",
	lArr: "⇐",
	DoubleLeftRightArrow: "⇔",
	Leftrightarrow: "⇔",
	hArr: "⇔",
	iff: "⇔",
	DoubleLongLeftArrow: "⟸",
	Longleftarrow: "⟸",
	xlArr: "⟸",
	DoubleLongLeftRightArrow: "⟺",
	Longleftrightarrow: "⟺",
	xhArr: "⟺",
	DoubleLongRightArrow: "⟹",
	Longrightarrow: "⟹",
	xrArr: "⟹",
	DoubleRightArrow: "⇒",
	Implies: "⇒",
	Rightarrow: "⇒",
	rArr: "⇒",
	DoubleRightTee: "⊨",
	vDash: "⊨",
	DoubleUpArrow: "⇑",
	Uparrow: "⇑",
	uArr: "⇑",
	DoubleUpDownArrow: "⇕",
	Updownarrow: "⇕",
	vArr: "⇕",
	DoubleVerticalBar: "∥",
	par: "∥",
	parallel: "∥",
	shortparallel: "∥",
	spar: "∥",
	DownArrow: "↓",
	ShortDownArrow: "↓",
	darr: "↓",
	downarrow: "↓",
	DownArrowBar: "⤓",
	DownArrowUpArrow: "⇵",
	duarr: "⇵",
	DownBreve: "̑",
	DownLeftRightVector: "⥐",
	DownLeftTeeVector: "⥞",
	DownLeftVector: "↽",
	leftharpoondown: "↽",
	lhard: "↽",
	DownLeftVectorBar: "⥖",
	DownRightTeeVector: "⥟",
	DownRightVector: "⇁",
	rhard: "⇁",
	rightharpoondown: "⇁",
	DownRightVectorBar: "⥗",
	DownTee: "⊤",
	top: "⊤",
	DownTeeArrow: "↧",
	mapstodown: "↧",
	Dscr: "𝒟",
	Dstrok: "Đ",
	ENG: "Ŋ",
	ETH: "Ð",
	Eacute: "É",
	Ecaron: "Ě",
	Ecirc: "Ê",
	Ecy: "Э",
	Edot: "Ė",
	Efr: "𝔈",
	Egrave: "È",
	Element: "∈",
	in: "∈",
	isin: "∈",
	isinv: "∈",
	Emacr: "Ē",
	EmptySmallSquare: "◻",
	EmptyVerySmallSquare: "▫",
	Eogon: "Ę",
	Eopf: "𝔼",
	Epsilon: "Ε",
	Equal: "⩵",
	EqualTilde: "≂",
	eqsim: "≂",
	esim: "≂",
	Equilibrium: "⇌",
	rightleftharpoons: "⇌",
	rlhar: "⇌",
	Escr: "ℰ",
	expectation: "ℰ",
	Esim: "⩳",
	Eta: "Η",
	Euml: "Ë",
	Exists: "∃",
	exist: "∃",
	ExponentialE: "ⅇ",
	ee: "ⅇ",
	exponentiale: "ⅇ",
	Fcy: "Ф",
	Ffr: "𝔉",
	FilledSmallSquare: "◼",
	FilledVerySmallSquare: "▪",
	blacksquare: "▪",
	squarf: "▪",
	squf: "▪",
	Fopf: "𝔽",
	ForAll: "∀",
	forall: "∀",
	Fouriertrf: "ℱ",
	Fscr: "ℱ",
	GJcy: "Ѓ",
	GT: ">",
	gt: ">",
	Gamma: "Γ",
	Gammad: "Ϝ",
	Gbreve: "Ğ",
	Gcedil: "Ģ",
	Gcirc: "Ĝ",
	Gcy: "Г",
	Gdot: "Ġ",
	Gfr: "𝔊",
	Gg: "⋙",
	ggg: "⋙",
	Gopf: "𝔾",
	GreaterEqual: "≥",
	ge: "≥",
	geq: "≥",
	GreaterEqualLess: "⋛",
	gel: "⋛",
	gtreqless: "⋛",
	GreaterFullEqual: "≧",
	gE: "≧",
	geqq: "≧",
	GreaterGreater: "⪢",
	GreaterLess: "≷",
	gl: "≷",
	gtrless: "≷",
	GreaterSlantEqual: "⩾",
	geqslant: "⩾",
	ges: "⩾",
	GreaterTilde: "≳",
	gsim: "≳",
	gtrsim: "≳",
	Gscr: "𝒢",
	Gt: "≫",
	NestedGreaterGreater: "≫",
	gg: "≫",
	HARDcy: "Ъ",
	Hacek: "ˇ",
	caron: "ˇ",
	Hat: "^",
	Hcirc: "Ĥ",
	Hfr: "ℌ",
	Poincareplane: "ℌ",
	HilbertSpace: "ℋ",
	Hscr: "ℋ",
	hamilt: "ℋ",
	Hopf: "ℍ",
	quaternions: "ℍ",
	HorizontalLine: "─",
	boxh: "─",
	Hstrok: "Ħ",
	HumpEqual: "≏",
	bumpe: "≏",
	bumpeq: "≏",
	IEcy: "Е",
	IJlig: "Ĳ",
	IOcy: "Ё",
	Iacute: "Í",
	Icirc: "Î",
	Icy: "И",
	Idot: "İ",
	Ifr: "ℑ",
	Im: "ℑ",
	image: "ℑ",
	imagpart: "ℑ",
	Igrave: "Ì",
	Imacr: "Ī",
	ImaginaryI: "ⅈ",
	ii: "ⅈ",
	Int: "∬",
	Integral: "∫",
	int: "∫",
	Intersection: "⋂",
	bigcap: "⋂",
	xcap: "⋂",
	InvisibleComma: "⁣",
	ic: "⁣",
	InvisibleTimes: "⁢",
	it: "⁢",
	Iogon: "Į",
	Iopf: "𝕀",
	Iota: "Ι",
	Iscr: "ℐ",
	imagline: "ℐ",
	Itilde: "Ĩ",
	Iukcy: "І",
	Iuml: "Ï",
	Jcirc: "Ĵ",
	Jcy: "Й",
	Jfr: "𝔍",
	Jopf: "𝕁",
	Jscr: "𝒥",
	Jsercy: "Ј",
	Jukcy: "Є",
	KHcy: "Х",
	KJcy: "Ќ",
	Kappa: "Κ",
	Kcedil: "Ķ",
	Kcy: "К",
	Kfr: "𝔎",
	Kopf: "𝕂",
	Kscr: "𝒦",
	LJcy: "Љ",
	LT: "<",
	lt: "<",
	Lacute: "Ĺ",
	Lambda: "Λ",
	Lang: "⟪",
	Laplacetrf: "ℒ",
	Lscr: "ℒ",
	lagran: "ℒ",
	Larr: "↞",
	twoheadleftarrow: "↞",
	Lcaron: "Ľ",
	Lcedil: "Ļ",
	Lcy: "Л",
	LeftAngleBracket: "⟨",
	lang: "⟨",
	langle: "⟨",
	LeftArrow: "←",
	ShortLeftArrow: "←",
	larr: "←",
	leftarrow: "←",
	slarr: "←",
	LeftArrowBar: "⇤",
	larrb: "⇤",
	LeftArrowRightArrow: "⇆",
	leftrightarrows: "⇆",
	lrarr: "⇆",
	LeftCeiling: "⌈",
	lceil: "⌈",
	LeftDoubleBracket: "⟦",
	lobrk: "⟦",
	LeftDownTeeVector: "⥡",
	LeftDownVector: "⇃",
	dharl: "⇃",
	downharpoonleft: "⇃",
	LeftDownVectorBar: "⥙",
	LeftFloor: "⌊",
	lfloor: "⌊",
	LeftRightArrow: "↔",
	harr: "↔",
	leftrightarrow: "↔",
	LeftRightVector: "⥎",
	LeftTee: "⊣",
	dashv: "⊣",
	LeftTeeArrow: "↤",
	mapstoleft: "↤",
	LeftTeeVector: "⥚",
	LeftTriangle: "⊲",
	vartriangleleft: "⊲",
	vltri: "⊲",
	LeftTriangleBar: "⧏",
	LeftTriangleEqual: "⊴",
	ltrie: "⊴",
	trianglelefteq: "⊴",
	LeftUpDownVector: "⥑",
	LeftUpTeeVector: "⥠",
	LeftUpVector: "↿",
	uharl: "↿",
	upharpoonleft: "↿",
	LeftUpVectorBar: "⥘",
	LeftVector: "↼",
	leftharpoonup: "↼",
	lharu: "↼",
	LeftVectorBar: "⥒",
	LessEqualGreater: "⋚",
	leg: "⋚",
	lesseqgtr: "⋚",
	LessFullEqual: "≦",
	lE: "≦",
	leqq: "≦",
	LessGreater: "≶",
	lessgtr: "≶",
	lg: "≶",
	LessLess: "⪡",
	LessSlantEqual: "⩽",
	leqslant: "⩽",
	les: "⩽",
	LessTilde: "≲",
	lesssim: "≲",
	lsim: "≲",
	Lfr: "𝔏",
	Ll: "⋘",
	Lleftarrow: "⇚",
	lAarr: "⇚",
	Lmidot: "Ŀ",
	LongLeftArrow: "⟵",
	longleftarrow: "⟵",
	xlarr: "⟵",
	LongLeftRightArrow: "⟷",
	longleftrightarrow: "⟷",
	xharr: "⟷",
	LongRightArrow: "⟶",
	longrightarrow: "⟶",
	xrarr: "⟶",
	Lopf: "𝕃",
	LowerLeftArrow: "↙",
	swarr: "↙",
	swarrow: "↙",
	LowerRightArrow: "↘",
	searr: "↘",
	searrow: "↘",
	Lsh: "↰",
	lsh: "↰",
	Lstrok: "Ł",
	Lt: "≪",
	NestedLessLess: "≪",
	ll: "≪",
	Map: "⤅",
	Mcy: "М",
	MediumSpace: " ",
	Mellintrf: "ℳ",
	Mscr: "ℳ",
	phmmat: "ℳ",
	Mfr: "𝔐",
	MinusPlus: "∓",
	mnplus: "∓",
	mp: "∓",
	Mopf: "𝕄",
	Mu: "Μ",
	NJcy: "Њ",
	Nacute: "Ń",
	Ncaron: "Ň",
	Ncedil: "Ņ",
	Ncy: "Н",
	NegativeMediumSpace: "​",
	NegativeThickSpace: "​",
	NegativeThinSpace: "​",
	NegativeVeryThinSpace: "​",
	ZeroWidthSpace: "​",
	NewLine: `
`,
	Nfr: "𝔑",
	NoBreak: "⁠",
	NonBreakingSpace: "\xA0",
	nbsp: "\xA0",
	Nopf: "ℕ",
	naturals: "ℕ",
	Not: "⫬",
	NotCongruent: "≢",
	nequiv: "≢",
	NotCupCap: "≭",
	NotDoubleVerticalBar: "∦",
	npar: "∦",
	nparallel: "∦",
	nshortparallel: "∦",
	nspar: "∦",
	NotElement: "∉",
	notin: "∉",
	notinva: "∉",
	NotEqual: "≠",
	ne: "≠",
	NotEqualTilde: "≂̸",
	nesim: "≂̸",
	NotExists: "∄",
	nexist: "∄",
	nexists: "∄",
	NotGreater: "≯",
	ngt: "≯",
	ngtr: "≯",
	NotGreaterEqual: "≱",
	nge: "≱",
	ngeq: "≱",
	NotGreaterFullEqual: "≧̸",
	ngE: "≧̸",
	ngeqq: "≧̸",
	NotGreaterGreater: "≫̸",
	nGtv: "≫̸",
	NotGreaterLess: "≹",
	ntgl: "≹",
	NotGreaterSlantEqual: "⩾̸",
	ngeqslant: "⩾̸",
	nges: "⩾̸",
	NotGreaterTilde: "≵",
	ngsim: "≵",
	NotHumpDownHump: "≎̸",
	nbump: "≎̸",
	NotHumpEqual: "≏̸",
	nbumpe: "≏̸",
	NotLeftTriangle: "⋪",
	nltri: "⋪",
	ntriangleleft: "⋪",
	NotLeftTriangleBar: "⧏̸",
	NotLeftTriangleEqual: "⋬",
	nltrie: "⋬",
	ntrianglelefteq: "⋬",
	NotLess: "≮",
	nless: "≮",
	nlt: "≮",
	NotLessEqual: "≰",
	nle: "≰",
	nleq: "≰",
	NotLessGreater: "≸",
	ntlg: "≸",
	NotLessLess: "≪̸",
	nLtv: "≪̸",
	NotLessSlantEqual: "⩽̸",
	nleqslant: "⩽̸",
	nles: "⩽̸",
	NotLessTilde: "≴",
	nlsim: "≴",
	NotNestedGreaterGreater: "⪢̸",
	NotNestedLessLess: "⪡̸",
	NotPrecedes: "⊀",
	npr: "⊀",
	nprec: "⊀",
	NotPrecedesEqual: "⪯̸",
	npre: "⪯̸",
	npreceq: "⪯̸",
	NotPrecedesSlantEqual: "⋠",
	nprcue: "⋠",
	NotReverseElement: "∌",
	notni: "∌",
	notniva: "∌",
	NotRightTriangle: "⋫",
	nrtri: "⋫",
	ntriangleright: "⋫",
	NotRightTriangleBar: "⧐̸",
	NotRightTriangleEqual: "⋭",
	nrtrie: "⋭",
	ntrianglerighteq: "⋭",
	NotSquareSubset: "⊏̸",
	NotSquareSubsetEqual: "⋢",
	nsqsube: "⋢",
	NotSquareSuperset: "⊐̸",
	NotSquareSupersetEqual: "⋣",
	nsqsupe: "⋣",
	NotSubset: "⊂⃒",
	nsubset: "⊂⃒",
	vnsub: "⊂⃒",
	NotSubsetEqual: "⊈",
	nsube: "⊈",
	nsubseteq: "⊈",
	NotSucceeds: "⊁",
	nsc: "⊁",
	nsucc: "⊁",
	NotSucceedsEqual: "⪰̸",
	nsce: "⪰̸",
	nsucceq: "⪰̸",
	NotSucceedsSlantEqual: "⋡",
	nsccue: "⋡",
	NotSucceedsTilde: "≿̸",
	NotSuperset: "⊃⃒",
	nsupset: "⊃⃒",
	vnsup: "⊃⃒",
	NotSupersetEqual: "⊉",
	nsupe: "⊉",
	nsupseteq: "⊉",
	NotTilde: "≁",
	nsim: "≁",
	NotTildeEqual: "≄",
	nsime: "≄",
	nsimeq: "≄",
	NotTildeFullEqual: "≇",
	ncong: "≇",
	NotTildeTilde: "≉",
	nap: "≉",
	napprox: "≉",
	NotVerticalBar: "∤",
	nmid: "∤",
	nshortmid: "∤",
	nsmid: "∤",
	Nscr: "𝒩",
	Ntilde: "Ñ",
	Nu: "Ν",
	OElig: "Œ",
	Oacute: "Ó",
	Ocirc: "Ô",
	Ocy: "О",
	Odblac: "Ő",
	Ofr: "𝔒",
	Ograve: "Ò",
	Omacr: "Ō",
	Omega: "Ω",
	ohm: "Ω",
	Omicron: "Ο",
	Oopf: "𝕆",
	OpenCurlyDoubleQuote: "“",
	ldquo: "“",
	OpenCurlyQuote: "‘",
	lsquo: "‘",
	Or: "⩔",
	Oscr: "𝒪",
	Oslash: "Ø",
	Otilde: "Õ",
	Otimes: "⨷",
	Ouml: "Ö",
	OverBar: "‾",
	oline: "‾",
	OverBrace: "⏞",
	OverBracket: "⎴",
	tbrk: "⎴",
	OverParenthesis: "⏜",
	PartialD: "∂",
	part: "∂",
	Pcy: "П",
	Pfr: "𝔓",
	Phi: "Φ",
	Pi: "Π",
	PlusMinus: "±",
	plusmn: "±",
	pm: "±",
	Popf: "ℙ",
	primes: "ℙ",
	Pr: "⪻",
	Precedes: "≺",
	pr: "≺",
	prec: "≺",
	PrecedesEqual: "⪯",
	pre: "⪯",
	preceq: "⪯",
	PrecedesSlantEqual: "≼",
	prcue: "≼",
	preccurlyeq: "≼",
	PrecedesTilde: "≾",
	precsim: "≾",
	prsim: "≾",
	Prime: "″",
	Product: "∏",
	prod: "∏",
	Proportional: "∝",
	prop: "∝",
	propto: "∝",
	varpropto: "∝",
	vprop: "∝",
	Pscr: "𝒫",
	Psi: "Ψ",
	QUOT: "\"",
	quot: "\"",
	Qfr: "𝔔",
	Qopf: "ℚ",
	rationals: "ℚ",
	Qscr: "𝒬",
	RBarr: "⤐",
	drbkarow: "⤐",
	REG: "®",
	circledR: "®",
	reg: "®",
	Racute: "Ŕ",
	Rang: "⟫",
	Rarr: "↠",
	twoheadrightarrow: "↠",
	Rarrtl: "⤖",
	Rcaron: "Ř",
	Rcedil: "Ŗ",
	Rcy: "Р",
	Re: "ℜ",
	Rfr: "ℜ",
	real: "ℜ",
	realpart: "ℜ",
	ReverseElement: "∋",
	SuchThat: "∋",
	ni: "∋",
	niv: "∋",
	ReverseEquilibrium: "⇋",
	leftrightharpoons: "⇋",
	lrhar: "⇋",
	ReverseUpEquilibrium: "⥯",
	duhar: "⥯",
	Rho: "Ρ",
	RightAngleBracket: "⟩",
	rang: "⟩",
	rangle: "⟩",
	RightArrow: "→",
	ShortRightArrow: "→",
	rarr: "→",
	rightarrow: "→",
	srarr: "→",
	RightArrowBar: "⇥",
	rarrb: "⇥",
	RightArrowLeftArrow: "⇄",
	rightleftarrows: "⇄",
	rlarr: "⇄",
	RightCeiling: "⌉",
	rceil: "⌉",
	RightDoubleBracket: "⟧",
	robrk: "⟧",
	RightDownTeeVector: "⥝",
	RightDownVector: "⇂",
	dharr: "⇂",
	downharpoonright: "⇂",
	RightDownVectorBar: "⥕",
	RightFloor: "⌋",
	rfloor: "⌋",
	RightTee: "⊢",
	vdash: "⊢",
	RightTeeArrow: "↦",
	map: "↦",
	mapsto: "↦",
	RightTeeVector: "⥛",
	RightTriangle: "⊳",
	vartriangleright: "⊳",
	vrtri: "⊳",
	RightTriangleBar: "⧐",
	RightTriangleEqual: "⊵",
	rtrie: "⊵",
	trianglerighteq: "⊵",
	RightUpDownVector: "⥏",
	RightUpTeeVector: "⥜",
	RightUpVector: "↾",
	uharr: "↾",
	upharpoonright: "↾",
	RightUpVectorBar: "⥔",
	RightVector: "⇀",
	rharu: "⇀",
	rightharpoonup: "⇀",
	RightVectorBar: "⥓",
	Ropf: "ℝ",
	reals: "ℝ",
	RoundImplies: "⥰",
	Rrightarrow: "⇛",
	rAarr: "⇛",
	Rscr: "ℛ",
	realine: "ℛ",
	Rsh: "↱",
	rsh: "↱",
	RuleDelayed: "⧴",
	SHCHcy: "Щ",
	SHcy: "Ш",
	SOFTcy: "Ь",
	Sacute: "Ś",
	Sc: "⪼",
	Scaron: "Š",
	Scedil: "Ş",
	Scirc: "Ŝ",
	Scy: "С",
	Sfr: "𝔖",
	ShortUpArrow: "↑",
	UpArrow: "↑",
	uarr: "↑",
	uparrow: "↑",
	Sigma: "Σ",
	SmallCircle: "∘",
	compfn: "∘",
	Sopf: "𝕊",
	Sqrt: "√",
	radic: "√",
	Square: "□",
	squ: "□",
	square: "□",
	SquareIntersection: "⊓",
	sqcap: "⊓",
	SquareSubset: "⊏",
	sqsub: "⊏",
	sqsubset: "⊏",
	SquareSubsetEqual: "⊑",
	sqsube: "⊑",
	sqsubseteq: "⊑",
	SquareSuperset: "⊐",
	sqsup: "⊐",
	sqsupset: "⊐",
	SquareSupersetEqual: "⊒",
	sqsupe: "⊒",
	sqsupseteq: "⊒",
	SquareUnion: "⊔",
	sqcup: "⊔",
	Sscr: "𝒮",
	Star: "⋆",
	sstarf: "⋆",
	Sub: "⋐",
	Subset: "⋐",
	SubsetEqual: "⊆",
	sube: "⊆",
	subseteq: "⊆",
	Succeeds: "≻",
	sc: "≻",
	succ: "≻",
	SucceedsEqual: "⪰",
	sce: "⪰",
	succeq: "⪰",
	SucceedsSlantEqual: "≽",
	sccue: "≽",
	succcurlyeq: "≽",
	SucceedsTilde: "≿",
	scsim: "≿",
	succsim: "≿",
	Sum: "∑",
	sum: "∑",
	Sup: "⋑",
	Supset: "⋑",
	Superset: "⊃",
	sup: "⊃",
	supset: "⊃",
	SupersetEqual: "⊇",
	supe: "⊇",
	supseteq: "⊇",
	THORN: "Þ",
	TRADE: "™",
	trade: "™",
	TSHcy: "Ћ",
	TScy: "Ц",
	Tab: "	",
	Tau: "Τ",
	Tcaron: "Ť",
	Tcedil: "Ţ",
	Tcy: "Т",
	Tfr: "𝔗",
	Therefore: "∴",
	there4: "∴",
	therefore: "∴",
	Theta: "Θ",
	ThickSpace: "  ",
	ThinSpace: " ",
	thinsp: " ",
	Tilde: "∼",
	sim: "∼",
	thicksim: "∼",
	thksim: "∼",
	TildeEqual: "≃",
	sime: "≃",
	simeq: "≃",
	TildeFullEqual: "≅",
	cong: "≅",
	TildeTilde: "≈",
	ap: "≈",
	approx: "≈",
	asymp: "≈",
	thickapprox: "≈",
	thkap: "≈",
	Topf: "𝕋",
	TripleDot: "⃛",
	tdot: "⃛",
	Tscr: "𝒯",
	Tstrok: "Ŧ",
	Uacute: "Ú",
	Uarr: "↟",
	Uarrocir: "⥉",
	Ubrcy: "Ў",
	Ubreve: "Ŭ",
	Ucirc: "Û",
	Ucy: "У",
	Udblac: "Ű",
	Ufr: "𝔘",
	Ugrave: "Ù",
	Umacr: "Ū",
	UnderBar: "_",
	lowbar: "_",
	UnderBrace: "⏟",
	UnderBracket: "⎵",
	bbrk: "⎵",
	UnderParenthesis: "⏝",
	Union: "⋃",
	bigcup: "⋃",
	xcup: "⋃",
	UnionPlus: "⊎",
	uplus: "⊎",
	Uogon: "Ų",
	Uopf: "𝕌",
	UpArrowBar: "⤒",
	UpArrowDownArrow: "⇅",
	udarr: "⇅",
	UpDownArrow: "↕",
	updownarrow: "↕",
	varr: "↕",
	UpEquilibrium: "⥮",
	udhar: "⥮",
	UpTee: "⊥",
	bot: "⊥",
	bottom: "⊥",
	perp: "⊥",
	UpTeeArrow: "↥",
	mapstoup: "↥",
	UpperLeftArrow: "↖",
	nwarr: "↖",
	nwarrow: "↖",
	UpperRightArrow: "↗",
	nearr: "↗",
	nearrow: "↗",
	Upsi: "ϒ",
	upsih: "ϒ",
	Upsilon: "Υ",
	Uring: "Ů",
	Uscr: "𝒰",
	Utilde: "Ũ",
	Uuml: "Ü",
	VDash: "⊫",
	Vbar: "⫫",
	Vcy: "В",
	Vdash: "⊩",
	Vdashl: "⫦",
	Vee: "⋁",
	bigvee: "⋁",
	xvee: "⋁",
	Verbar: "‖",
	Vert: "‖",
	VerticalBar: "∣",
	mid: "∣",
	shortmid: "∣",
	smid: "∣",
	VerticalLine: "|",
	verbar: "|",
	vert: "|",
	VerticalSeparator: "❘",
	VerticalTilde: "≀",
	wr: "≀",
	wreath: "≀",
	VeryThinSpace: " ",
	hairsp: " ",
	Vfr: "𝔙",
	Vopf: "𝕍",
	Vscr: "𝒱",
	Vvdash: "⊪",
	Wcirc: "Ŵ",
	Wedge: "⋀",
	bigwedge: "⋀",
	xwedge: "⋀",
	Wfr: "𝔚",
	Wopf: "𝕎",
	Wscr: "𝒲",
	Xfr: "𝔛",
	Xi: "Ξ",
	Xopf: "𝕏",
	Xscr: "𝒳",
	YAcy: "Я",
	YIcy: "Ї",
	YUcy: "Ю",
	Yacute: "Ý",
	Ycirc: "Ŷ",
	Ycy: "Ы",
	Yfr: "𝔜",
	Yopf: "𝕐",
	Yscr: "𝒴",
	Yuml: "Ÿ",
	ZHcy: "Ж",
	Zacute: "Ź",
	Zcaron: "Ž",
	Zcy: "З",
	Zdot: "Ż",
	Zeta: "Ζ",
	Zfr: "ℨ",
	zeetrf: "ℨ",
	Zopf: "ℤ",
	integers: "ℤ",
	Zscr: "𝒵",
	aacute: "á",
	abreve: "ă",
	ac: "∾",
	mstpos: "∾",
	acE: "∾̳",
	acd: "∿",
	acirc: "â",
	acy: "а",
	aelig: "æ",
	afr: "𝔞",
	agrave: "à",
	alefsym: "ℵ",
	aleph: "ℵ",
	alpha: "α",
	amacr: "ā",
	amalg: "⨿",
	and: "∧",
	wedge: "∧",
	andand: "⩕",
	andd: "⩜",
	andslope: "⩘",
	andv: "⩚",
	ang: "∠",
	angle: "∠",
	ange: "⦤",
	angmsd: "∡",
	measuredangle: "∡",
	angmsdaa: "⦨",
	angmsdab: "⦩",
	angmsdac: "⦪",
	angmsdad: "⦫",
	angmsdae: "⦬",
	angmsdaf: "⦭",
	angmsdag: "⦮",
	angmsdah: "⦯",
	angrt: "∟",
	angrtvb: "⊾",
	angrtvbd: "⦝",
	angsph: "∢",
	angzarr: "⍼",
	aogon: "ą",
	aopf: "𝕒",
	apE: "⩰",
	apacir: "⩯",
	ape: "≊",
	approxeq: "≊",
	apid: "≋",
	apos: "'",
	aring: "å",
	ascr: "𝒶",
	ast: "*",
	midast: "*",
	atilde: "ã",
	auml: "ä",
	awint: "⨑",
	bNot: "⫭",
	backcong: "≌",
	bcong: "≌",
	backepsilon: "϶",
	bepsi: "϶",
	backprime: "‵",
	bprime: "‵",
	backsim: "∽",
	bsim: "∽",
	backsimeq: "⋍",
	bsime: "⋍",
	barvee: "⊽",
	barwed: "⌅",
	barwedge: "⌅",
	bbrktbrk: "⎶",
	bcy: "б",
	bdquo: "„",
	ldquor: "„",
	bemptyv: "⦰",
	beta: "β",
	beth: "ℶ",
	between: "≬",
	twixt: "≬",
	bfr: "𝔟",
	bigcirc: "◯",
	xcirc: "◯",
	bigodot: "⨀",
	xodot: "⨀",
	bigoplus: "⨁",
	xoplus: "⨁",
	bigotimes: "⨂",
	xotime: "⨂",
	bigsqcup: "⨆",
	xsqcup: "⨆",
	bigstar: "★",
	starf: "★",
	bigtriangledown: "▽",
	xdtri: "▽",
	bigtriangleup: "△",
	xutri: "△",
	biguplus: "⨄",
	xuplus: "⨄",
	bkarow: "⤍",
	rbarr: "⤍",
	blacklozenge: "⧫",
	lozf: "⧫",
	blacktriangle: "▴",
	utrif: "▴",
	blacktriangledown: "▾",
	dtrif: "▾",
	blacktriangleleft: "◂",
	ltrif: "◂",
	blacktriangleright: "▸",
	rtrif: "▸",
	blank: "␣",
	blk12: "▒",
	blk14: "░",
	blk34: "▓",
	block: "█",
	bne: "=⃥",
	bnequiv: "≡⃥",
	bnot: "⌐",
	bopf: "𝕓",
	bowtie: "⋈",
	boxDL: "╗",
	boxDR: "╔",
	boxDl: "╖",
	boxDr: "╓",
	boxH: "═",
	boxHD: "╦",
	boxHU: "╩",
	boxHd: "╤",
	boxHu: "╧",
	boxUL: "╝",
	boxUR: "╚",
	boxUl: "╜",
	boxUr: "╙",
	boxV: "║",
	boxVH: "╬",
	boxVL: "╣",
	boxVR: "╠",
	boxVh: "╫",
	boxVl: "╢",
	boxVr: "╟",
	boxbox: "⧉",
	boxdL: "╕",
	boxdR: "╒",
	boxdl: "┐",
	boxdr: "┌",
	boxhD: "╥",
	boxhU: "╨",
	boxhd: "┬",
	boxhu: "┴",
	boxminus: "⊟",
	minusb: "⊟",
	boxplus: "⊞",
	plusb: "⊞",
	boxtimes: "⊠",
	timesb: "⊠",
	boxuL: "╛",
	boxuR: "╘",
	boxul: "┘",
	boxur: "└",
	boxv: "│",
	boxvH: "╪",
	boxvL: "╡",
	boxvR: "╞",
	boxvh: "┼",
	boxvl: "┤",
	boxvr: "├",
	brvbar: "¦",
	bscr: "𝒷",
	bsemi: "⁏",
	bsol: "\\",
	bsolb: "⧅",
	bsolhsub: "⟈",
	bull: "•",
	bullet: "•",
	bumpE: "⪮",
	cacute: "ć",
	cap: "∩",
	capand: "⩄",
	capbrcup: "⩉",
	capcap: "⩋",
	capcup: "⩇",
	capdot: "⩀",
	caps: "∩︀",
	caret: "⁁",
	ccaps: "⩍",
	ccaron: "č",
	ccedil: "ç",
	ccirc: "ĉ",
	ccups: "⩌",
	ccupssm: "⩐",
	cdot: "ċ",
	cemptyv: "⦲",
	cent: "¢",
	cfr: "𝔠",
	chcy: "ч",
	check: "✓",
	checkmark: "✓",
	chi: "χ",
	cir: "○",
	cirE: "⧃",
	circ: "ˆ",
	circeq: "≗",
	cire: "≗",
	circlearrowleft: "↺",
	olarr: "↺",
	circlearrowright: "↻",
	orarr: "↻",
	circledS: "Ⓢ",
	oS: "Ⓢ",
	circledast: "⊛",
	oast: "⊛",
	circledcirc: "⊚",
	ocir: "⊚",
	circleddash: "⊝",
	odash: "⊝",
	cirfnint: "⨐",
	cirmid: "⫯",
	cirscir: "⧂",
	clubs: "♣",
	clubsuit: "♣",
	colon: ":",
	comma: ",",
	commat: "@",
	comp: "∁",
	complement: "∁",
	congdot: "⩭",
	copf: "𝕔",
	copysr: "℗",
	crarr: "↵",
	cross: "✗",
	cscr: "𝒸",
	csub: "⫏",
	csube: "⫑",
	csup: "⫐",
	csupe: "⫒",
	ctdot: "⋯",
	cudarrl: "⤸",
	cudarrr: "⤵",
	cuepr: "⋞",
	curlyeqprec: "⋞",
	cuesc: "⋟",
	curlyeqsucc: "⋟",
	cularr: "↶",
	curvearrowleft: "↶",
	cularrp: "⤽",
	cup: "∪",
	cupbrcap: "⩈",
	cupcap: "⩆",
	cupcup: "⩊",
	cupdot: "⊍",
	cupor: "⩅",
	cups: "∪︀",
	curarr: "↷",
	curvearrowright: "↷",
	curarrm: "⤼",
	curlyvee: "⋎",
	cuvee: "⋎",
	curlywedge: "⋏",
	cuwed: "⋏",
	curren: "¤",
	cwint: "∱",
	cylcty: "⌭",
	dHar: "⥥",
	dagger: "†",
	daleth: "ℸ",
	dash: "‐",
	hyphen: "‐",
	dbkarow: "⤏",
	rBarr: "⤏",
	dcaron: "ď",
	dcy: "д",
	ddarr: "⇊",
	downdownarrows: "⇊",
	ddotseq: "⩷",
	eDDot: "⩷",
	deg: "°",
	delta: "δ",
	demptyv: "⦱",
	dfisht: "⥿",
	dfr: "𝔡",
	diamondsuit: "♦",
	diams: "♦",
	digamma: "ϝ",
	gammad: "ϝ",
	disin: "⋲",
	div: "÷",
	divide: "÷",
	divideontimes: "⋇",
	divonx: "⋇",
	djcy: "ђ",
	dlcorn: "⌞",
	llcorner: "⌞",
	dlcrop: "⌍",
	dollar: "$",
	dopf: "𝕕",
	doteqdot: "≑",
	eDot: "≑",
	dotminus: "∸",
	minusd: "∸",
	dotplus: "∔",
	plusdo: "∔",
	dotsquare: "⊡",
	sdotb: "⊡",
	drcorn: "⌟",
	lrcorner: "⌟",
	drcrop: "⌌",
	dscr: "𝒹",
	dscy: "ѕ",
	dsol: "⧶",
	dstrok: "đ",
	dtdot: "⋱",
	dtri: "▿",
	triangledown: "▿",
	dwangle: "⦦",
	dzcy: "џ",
	dzigrarr: "⟿",
	eacute: "é",
	easter: "⩮",
	ecaron: "ě",
	ecir: "≖",
	eqcirc: "≖",
	ecirc: "ê",
	ecolon: "≕",
	eqcolon: "≕",
	ecy: "э",
	edot: "ė",
	efDot: "≒",
	fallingdotseq: "≒",
	efr: "𝔢",
	eg: "⪚",
	egrave: "è",
	egs: "⪖",
	eqslantgtr: "⪖",
	egsdot: "⪘",
	el: "⪙",
	elinters: "⏧",
	ell: "ℓ",
	els: "⪕",
	eqslantless: "⪕",
	elsdot: "⪗",
	emacr: "ē",
	empty: "∅",
	emptyset: "∅",
	emptyv: "∅",
	varnothing: "∅",
	emsp13: " ",
	emsp14: " ",
	emsp: " ",
	eng: "ŋ",
	ensp: " ",
	eogon: "ę",
	eopf: "𝕖",
	epar: "⋕",
	eparsl: "⧣",
	eplus: "⩱",
	epsi: "ε",
	epsilon: "ε",
	epsiv: "ϵ",
	straightepsilon: "ϵ",
	varepsilon: "ϵ",
	equals: "=",
	equest: "≟",
	questeq: "≟",
	equivDD: "⩸",
	eqvparsl: "⧥",
	erDot: "≓",
	risingdotseq: "≓",
	erarr: "⥱",
	escr: "ℯ",
	eta: "η",
	eth: "ð",
	euml: "ë",
	euro: "€",
	excl: "!",
	fcy: "ф",
	female: "♀",
	ffilig: "ﬃ",
	fflig: "ﬀ",
	ffllig: "ﬄ",
	ffr: "𝔣",
	filig: "ﬁ",
	fjlig: "fj",
	flat: "♭",
	fllig: "ﬂ",
	fltns: "▱",
	fnof: "ƒ",
	fopf: "𝕗",
	fork: "⋔",
	pitchfork: "⋔",
	forkv: "⫙",
	fpartint: "⨍",
	frac12: "½",
	half: "½",
	frac13: "⅓",
	frac14: "¼",
	frac15: "⅕",
	frac16: "⅙",
	frac18: "⅛",
	frac23: "⅔",
	frac25: "⅖",
	frac34: "¾",
	frac35: "⅗",
	frac38: "⅜",
	frac45: "⅘",
	frac56: "⅚",
	frac58: "⅝",
	frac78: "⅞",
	frasl: "⁄",
	frown: "⌢",
	sfrown: "⌢",
	fscr: "𝒻",
	gEl: "⪌",
	gtreqqless: "⪌",
	gacute: "ǵ",
	gamma: "γ",
	gap: "⪆",
	gtrapprox: "⪆",
	gbreve: "ğ",
	gcirc: "ĝ",
	gcy: "г",
	gdot: "ġ",
	gescc: "⪩",
	gesdot: "⪀",
	gesdoto: "⪂",
	gesdotol: "⪄",
	gesl: "⋛︀",
	gesles: "⪔",
	gfr: "𝔤",
	gimel: "ℷ",
	gjcy: "ѓ",
	glE: "⪒",
	gla: "⪥",
	glj: "⪤",
	gnE: "≩",
	gneqq: "≩",
	gnap: "⪊",
	gnapprox: "⪊",
	gne: "⪈",
	gneq: "⪈",
	gnsim: "⋧",
	gopf: "𝕘",
	gscr: "ℊ",
	gsime: "⪎",
	gsiml: "⪐",
	gtcc: "⪧",
	gtcir: "⩺",
	gtdot: "⋗",
	gtrdot: "⋗",
	gtlPar: "⦕",
	gtquest: "⩼",
	gtrarr: "⥸",
	gvertneqq: "≩︀",
	gvnE: "≩︀",
	hardcy: "ъ",
	harrcir: "⥈",
	harrw: "↭",
	leftrightsquigarrow: "↭",
	hbar: "ℏ",
	hslash: "ℏ",
	planck: "ℏ",
	plankv: "ℏ",
	hcirc: "ĥ",
	hearts: "♥",
	heartsuit: "♥",
	hellip: "…",
	mldr: "…",
	hercon: "⊹",
	hfr: "𝔥",
	hksearow: "⤥",
	searhk: "⤥",
	hkswarow: "⤦",
	swarhk: "⤦",
	hoarr: "⇿",
	homtht: "∻",
	hookleftarrow: "↩",
	larrhk: "↩",
	hookrightarrow: "↪",
	rarrhk: "↪",
	hopf: "𝕙",
	horbar: "―",
	hscr: "𝒽",
	hstrok: "ħ",
	hybull: "⁃",
	iacute: "í",
	icirc: "î",
	icy: "и",
	iecy: "е",
	iexcl: "¡",
	ifr: "𝔦",
	igrave: "ì",
	iiiint: "⨌",
	qint: "⨌",
	iiint: "∭",
	tint: "∭",
	iinfin: "⧜",
	iiota: "℩",
	ijlig: "ĳ",
	imacr: "ī",
	imath: "ı",
	inodot: "ı",
	imof: "⊷",
	imped: "Ƶ",
	incare: "℅",
	infin: "∞",
	infintie: "⧝",
	intcal: "⊺",
	intercal: "⊺",
	intlarhk: "⨗",
	intprod: "⨼",
	iprod: "⨼",
	iocy: "ё",
	iogon: "į",
	iopf: "𝕚",
	iota: "ι",
	iquest: "¿",
	iscr: "𝒾",
	isinE: "⋹",
	isindot: "⋵",
	isins: "⋴",
	isinsv: "⋳",
	itilde: "ĩ",
	iukcy: "і",
	iuml: "ï",
	jcirc: "ĵ",
	jcy: "й",
	jfr: "𝔧",
	jmath: "ȷ",
	jopf: "𝕛",
	jscr: "𝒿",
	jsercy: "ј",
	jukcy: "є",
	kappa: "κ",
	kappav: "ϰ",
	varkappa: "ϰ",
	kcedil: "ķ",
	kcy: "к",
	kfr: "𝔨",
	kgreen: "ĸ",
	khcy: "х",
	kjcy: "ќ",
	kopf: "𝕜",
	kscr: "𝓀",
	lAtail: "⤛",
	lBarr: "⤎",
	lEg: "⪋",
	lesseqqgtr: "⪋",
	lHar: "⥢",
	lacute: "ĺ",
	laemptyv: "⦴",
	lambda: "λ",
	langd: "⦑",
	lap: "⪅",
	lessapprox: "⪅",
	laquo: "«",
	larrbfs: "⤟",
	larrfs: "⤝",
	larrlp: "↫",
	looparrowleft: "↫",
	larrpl: "⤹",
	larrsim: "⥳",
	larrtl: "↢",
	leftarrowtail: "↢",
	lat: "⪫",
	latail: "⤙",
	late: "⪭",
	lates: "⪭︀",
	lbarr: "⤌",
	lbbrk: "❲",
	lbrace: "{",
	lcub: "{",
	lbrack: "[",
	lsqb: "[",
	lbrke: "⦋",
	lbrksld: "⦏",
	lbrkslu: "⦍",
	lcaron: "ľ",
	lcedil: "ļ",
	lcy: "л",
	ldca: "⤶",
	ldrdhar: "⥧",
	ldrushar: "⥋",
	ldsh: "↲",
	le: "≤",
	leq: "≤",
	leftleftarrows: "⇇",
	llarr: "⇇",
	leftthreetimes: "⋋",
	lthree: "⋋",
	lescc: "⪨",
	lesdot: "⩿",
	lesdoto: "⪁",
	lesdotor: "⪃",
	lesg: "⋚︀",
	lesges: "⪓",
	lessdot: "⋖",
	ltdot: "⋖",
	lfisht: "⥼",
	lfr: "𝔩",
	lgE: "⪑",
	lharul: "⥪",
	lhblk: "▄",
	ljcy: "љ",
	llhard: "⥫",
	lltri: "◺",
	lmidot: "ŀ",
	lmoust: "⎰",
	lmoustache: "⎰",
	lnE: "≨",
	lneqq: "≨",
	lnap: "⪉",
	lnapprox: "⪉",
	lne: "⪇",
	lneq: "⪇",
	lnsim: "⋦",
	loang: "⟬",
	loarr: "⇽",
	longmapsto: "⟼",
	xmap: "⟼",
	looparrowright: "↬",
	rarrlp: "↬",
	lopar: "⦅",
	lopf: "𝕝",
	loplus: "⨭",
	lotimes: "⨴",
	lowast: "∗",
	loz: "◊",
	lozenge: "◊",
	lpar: "(",
	lparlt: "⦓",
	lrhard: "⥭",
	lrm: "‎",
	lrtri: "⊿",
	lsaquo: "‹",
	lscr: "𝓁",
	lsime: "⪍",
	lsimg: "⪏",
	lsquor: "‚",
	sbquo: "‚",
	lstrok: "ł",
	ltcc: "⪦",
	ltcir: "⩹",
	ltimes: "⋉",
	ltlarr: "⥶",
	ltquest: "⩻",
	ltrPar: "⦖",
	ltri: "◃",
	triangleleft: "◃",
	lurdshar: "⥊",
	luruhar: "⥦",
	lvertneqq: "≨︀",
	lvnE: "≨︀",
	mDDot: "∺",
	macr: "¯",
	strns: "¯",
	male: "♂",
	malt: "✠",
	maltese: "✠",
	marker: "▮",
	mcomma: "⨩",
	mcy: "м",
	mdash: "—",
	mfr: "𝔪",
	mho: "℧",
	micro: "µ",
	midcir: "⫰",
	minus: "−",
	minusdu: "⨪",
	mlcp: "⫛",
	models: "⊧",
	mopf: "𝕞",
	mscr: "𝓂",
	mu: "μ",
	multimap: "⊸",
	mumap: "⊸",
	nGg: "⋙̸",
	nGt: "≫⃒",
	nLeftarrow: "⇍",
	nlArr: "⇍",
	nLeftrightarrow: "⇎",
	nhArr: "⇎",
	nLl: "⋘̸",
	nLt: "≪⃒",
	nRightarrow: "⇏",
	nrArr: "⇏",
	nVDash: "⊯",
	nVdash: "⊮",
	nacute: "ń",
	nang: "∠⃒",
	napE: "⩰̸",
	napid: "≋̸",
	napos: "ŉ",
	natur: "♮",
	natural: "♮",
	ncap: "⩃",
	ncaron: "ň",
	ncedil: "ņ",
	ncongdot: "⩭̸",
	ncup: "⩂",
	ncy: "н",
	ndash: "–",
	neArr: "⇗",
	nearhk: "⤤",
	nedot: "≐̸",
	nesear: "⤨",
	toea: "⤨",
	nfr: "𝔫",
	nharr: "↮",
	nleftrightarrow: "↮",
	nhpar: "⫲",
	nis: "⋼",
	nisd: "⋺",
	njcy: "њ",
	nlE: "≦̸",
	nleqq: "≦̸",
	nlarr: "↚",
	nleftarrow: "↚",
	nldr: "‥",
	nopf: "𝕟",
	not: "¬",
	notinE: "⋹̸",
	notindot: "⋵̸",
	notinvb: "⋷",
	notinvc: "⋶",
	notnivb: "⋾",
	notnivc: "⋽",
	nparsl: "⫽⃥",
	npart: "∂̸",
	npolint: "⨔",
	nrarr: "↛",
	nrightarrow: "↛",
	nrarrc: "⤳̸",
	nrarrw: "↝̸",
	nscr: "𝓃",
	nsub: "⊄",
	nsubE: "⫅̸",
	nsubseteqq: "⫅̸",
	nsup: "⊅",
	nsupE: "⫆̸",
	nsupseteqq: "⫆̸",
	ntilde: "ñ",
	nu: "ν",
	num: "#",
	numero: "№",
	numsp: " ",
	nvDash: "⊭",
	nvHarr: "⤄",
	nvap: "≍⃒",
	nvdash: "⊬",
	nvge: "≥⃒",
	nvgt: ">⃒",
	nvinfin: "⧞",
	nvlArr: "⤂",
	nvle: "≤⃒",
	nvlt: "<⃒",
	nvltrie: "⊴⃒",
	nvrArr: "⤃",
	nvrtrie: "⊵⃒",
	nvsim: "∼⃒",
	nwArr: "⇖",
	nwarhk: "⤣",
	nwnear: "⤧",
	oacute: "ó",
	ocirc: "ô",
	ocy: "о",
	odblac: "ő",
	odiv: "⨸",
	odsold: "⦼",
	oelig: "œ",
	ofcir: "⦿",
	ofr: "𝔬",
	ogon: "˛",
	ograve: "ò",
	ogt: "⧁",
	ohbar: "⦵",
	olcir: "⦾",
	olcross: "⦻",
	olt: "⧀",
	omacr: "ō",
	omega: "ω",
	omicron: "ο",
	omid: "⦶",
	oopf: "𝕠",
	opar: "⦷",
	operp: "⦹",
	or: "∨",
	vee: "∨",
	ord: "⩝",
	order: "ℴ",
	orderof: "ℴ",
	oscr: "ℴ",
	ordf: "ª",
	ordm: "º",
	origof: "⊶",
	oror: "⩖",
	orslope: "⩗",
	orv: "⩛",
	oslash: "ø",
	osol: "⊘",
	otilde: "õ",
	otimesas: "⨶",
	ouml: "ö",
	ovbar: "⌽",
	para: "¶",
	parsim: "⫳",
	parsl: "⫽",
	pcy: "п",
	percnt: "%",
	period: ".",
	permil: "‰",
	pertenk: "‱",
	pfr: "𝔭",
	phi: "φ",
	phiv: "ϕ",
	straightphi: "ϕ",
	varphi: "ϕ",
	phone: "☎",
	pi: "π",
	piv: "ϖ",
	varpi: "ϖ",
	planckh: "ℎ",
	plus: "+",
	plusacir: "⨣",
	pluscir: "⨢",
	plusdu: "⨥",
	pluse: "⩲",
	plussim: "⨦",
	plustwo: "⨧",
	pointint: "⨕",
	popf: "𝕡",
	pound: "£",
	prE: "⪳",
	prap: "⪷",
	precapprox: "⪷",
	precnapprox: "⪹",
	prnap: "⪹",
	precneqq: "⪵",
	prnE: "⪵",
	precnsim: "⋨",
	prnsim: "⋨",
	prime: "′",
	profalar: "⌮",
	profline: "⌒",
	profsurf: "⌓",
	prurel: "⊰",
	pscr: "𝓅",
	psi: "ψ",
	puncsp: " ",
	qfr: "𝔮",
	qopf: "𝕢",
	qprime: "⁗",
	qscr: "𝓆",
	quatint: "⨖",
	quest: "?",
	rAtail: "⤜",
	rHar: "⥤",
	race: "∽̱",
	racute: "ŕ",
	raemptyv: "⦳",
	rangd: "⦒",
	range: "⦥",
	raquo: "»",
	rarrap: "⥵",
	rarrbfs: "⤠",
	rarrc: "⤳",
	rarrfs: "⤞",
	rarrpl: "⥅",
	rarrsim: "⥴",
	rarrtl: "↣",
	rightarrowtail: "↣",
	rarrw: "↝",
	rightsquigarrow: "↝",
	ratail: "⤚",
	ratio: "∶",
	rbbrk: "❳",
	rbrace: "}",
	rcub: "}",
	rbrack: "]",
	rsqb: "]",
	rbrke: "⦌",
	rbrksld: "⦎",
	rbrkslu: "⦐",
	rcaron: "ř",
	rcedil: "ŗ",
	rcy: "р",
	rdca: "⤷",
	rdldhar: "⥩",
	rdsh: "↳",
	rect: "▭",
	rfisht: "⥽",
	rfr: "𝔯",
	rharul: "⥬",
	rho: "ρ",
	rhov: "ϱ",
	varrho: "ϱ",
	rightrightarrows: "⇉",
	rrarr: "⇉",
	rightthreetimes: "⋌",
	rthree: "⋌",
	ring: "˚",
	rlm: "‏",
	rmoust: "⎱",
	rmoustache: "⎱",
	rnmid: "⫮",
	roang: "⟭",
	roarr: "⇾",
	ropar: "⦆",
	ropf: "𝕣",
	roplus: "⨮",
	rotimes: "⨵",
	rpar: ")",
	rpargt: "⦔",
	rppolint: "⨒",
	rsaquo: "›",
	rscr: "𝓇",
	rtimes: "⋊",
	rtri: "▹",
	triangleright: "▹",
	rtriltri: "⧎",
	ruluhar: "⥨",
	rx: "℞",
	sacute: "ś",
	scE: "⪴",
	scap: "⪸",
	succapprox: "⪸",
	scaron: "š",
	scedil: "ş",
	scirc: "ŝ",
	scnE: "⪶",
	succneqq: "⪶",
	scnap: "⪺",
	succnapprox: "⪺",
	scnsim: "⋩",
	succnsim: "⋩",
	scpolint: "⨓",
	scy: "с",
	sdot: "⋅",
	sdote: "⩦",
	seArr: "⇘",
	sect: "§",
	semi: ";",
	seswar: "⤩",
	tosa: "⤩",
	sext: "✶",
	sfr: "𝔰",
	sharp: "♯",
	shchcy: "щ",
	shcy: "ш",
	shy: "­",
	sigma: "σ",
	sigmaf: "ς",
	sigmav: "ς",
	varsigma: "ς",
	simdot: "⩪",
	simg: "⪞",
	simgE: "⪠",
	siml: "⪝",
	simlE: "⪟",
	simne: "≆",
	simplus: "⨤",
	simrarr: "⥲",
	smashp: "⨳",
	smeparsl: "⧤",
	smile: "⌣",
	ssmile: "⌣",
	smt: "⪪",
	smte: "⪬",
	smtes: "⪬︀",
	softcy: "ь",
	sol: "/",
	solb: "⧄",
	solbar: "⌿",
	sopf: "𝕤",
	spades: "♠",
	spadesuit: "♠",
	sqcaps: "⊓︀",
	sqcups: "⊔︀",
	sscr: "𝓈",
	star: "☆",
	sub: "⊂",
	subset: "⊂",
	subE: "⫅",
	subseteqq: "⫅",
	subdot: "⪽",
	subedot: "⫃",
	submult: "⫁",
	subnE: "⫋",
	subsetneqq: "⫋",
	subne: "⊊",
	subsetneq: "⊊",
	subplus: "⪿",
	subrarr: "⥹",
	subsim: "⫇",
	subsub: "⫕",
	subsup: "⫓",
	sung: "♪",
	sup1: "¹",
	sup2: "²",
	sup3: "³",
	supE: "⫆",
	supseteqq: "⫆",
	supdot: "⪾",
	supdsub: "⫘",
	supedot: "⫄",
	suphsol: "⟉",
	suphsub: "⫗",
	suplarr: "⥻",
	supmult: "⫂",
	supnE: "⫌",
	supsetneqq: "⫌",
	supne: "⊋",
	supsetneq: "⊋",
	supplus: "⫀",
	supsim: "⫈",
	supsub: "⫔",
	supsup: "⫖",
	swArr: "⇙",
	swnwar: "⤪",
	szlig: "ß",
	target: "⌖",
	tau: "τ",
	tcaron: "ť",
	tcedil: "ţ",
	tcy: "т",
	telrec: "⌕",
	tfr: "𝔱",
	theta: "θ",
	thetasym: "ϑ",
	thetav: "ϑ",
	vartheta: "ϑ",
	thorn: "þ",
	times: "×",
	timesbar: "⨱",
	timesd: "⨰",
	topbot: "⌶",
	topcir: "⫱",
	topf: "𝕥",
	topfork: "⫚",
	tprime: "‴",
	triangle: "▵",
	utri: "▵",
	triangleq: "≜",
	trie: "≜",
	tridot: "◬",
	triminus: "⨺",
	triplus: "⨹",
	trisb: "⧍",
	tritime: "⨻",
	trpezium: "⏢",
	tscr: "𝓉",
	tscy: "ц",
	tshcy: "ћ",
	tstrok: "ŧ",
	uHar: "⥣",
	uacute: "ú",
	ubrcy: "ў",
	ubreve: "ŭ",
	ucirc: "û",
	ucy: "у",
	udblac: "ű",
	ufisht: "⥾",
	ufr: "𝔲",
	ugrave: "ù",
	uhblk: "▀",
	ulcorn: "⌜",
	ulcorner: "⌜",
	ulcrop: "⌏",
	ultri: "◸",
	umacr: "ū",
	uogon: "ų",
	uopf: "𝕦",
	upsi: "υ",
	upsilon: "υ",
	upuparrows: "⇈",
	uuarr: "⇈",
	urcorn: "⌝",
	urcorner: "⌝",
	urcrop: "⌎",
	uring: "ů",
	urtri: "◹",
	uscr: "𝓊",
	utdot: "⋰",
	utilde: "ũ",
	uuml: "ü",
	uwangle: "⦧",
	vBar: "⫨",
	vBarv: "⫩",
	vangrt: "⦜",
	varsubsetneq: "⊊︀",
	vsubne: "⊊︀",
	varsubsetneqq: "⫋︀",
	vsubnE: "⫋︀",
	varsupsetneq: "⊋︀",
	vsupne: "⊋︀",
	varsupsetneqq: "⫌︀",
	vsupnE: "⫌︀",
	vcy: "в",
	veebar: "⊻",
	veeeq: "≚",
	vellip: "⋮",
	vfr: "𝔳",
	vopf: "𝕧",
	vscr: "𝓋",
	vzigzag: "⦚",
	wcirc: "ŵ",
	wedbar: "⩟",
	wedgeq: "≙",
	weierp: "℘",
	wp: "℘",
	wfr: "𝔴",
	wopf: "𝕨",
	wscr: "𝓌",
	xfr: "𝔵",
	xi: "ξ",
	xnis: "⋻",
	xopf: "𝕩",
	xscr: "𝓍",
	yacute: "ý",
	yacy: "я",
	ycirc: "ŷ",
	ycy: "ы",
	yen: "¥",
	yfr: "𝔶",
	yicy: "ї",
	yopf: "𝕪",
	yscr: "𝓎",
	yucy: "ю",
	yuml: "ÿ",
	zacute: "ź",
	zcaron: "ž",
	zcy: "з",
	zdot: "ż",
	zeta: "ζ",
	zfr: "𝔷",
	zhcy: "ж",
	zigrarr: "⇝",
	zopf: "𝕫",
	zscr: "𝓏",
	zwj: "‍",
	zwnj: "‌"
};
Ve.ngsp = "";
var go = [
	/@/,
	/^\s*$/,
	/[<>]/,
	/^[{}]$/,
	/&(#|[a-z])/i,
	/^\/\//
];
function Xs(t, e) {
	if (e != null && !(Array.isArray(e) && e.length == 2)) throw new Error(`Expected '${t}' to be an array, [start, end].`);
	if (e != null) {
		let r = e[0], n = e[1];
		go.forEach((s) => {
			if (s.test(r) || s.test(n)) throw new Error(`['${r}', '${n}'] contains unusable interpolation symbol.`);
		});
	}
}
var Or = new class t {
	static fromArray(e) {
		return e ? (Xs("interpolation", e), new t(e[0], e[1])) : Or;
	}
	constructor(e, r) {
		this.start = e, this.end = r;
	}
}("{{", "}}");
var gt = class extends Oe {
	constructor(e, r, n) {
		super(n, e), this.tokenType = r;
	}
};
var Ur = class {
	constructor(e, r, n) {
		this.tokens = e, this.errors = r, this.nonNormalizedIcuExpressions = n;
	}
};
function li(t, e, r, n = {}) {
	let s = new Wr(new ve(t, e), r, n);
	return s.tokenize(), new Ur(Vo(s.tokens), s.errors, s.nonNormalizedIcuExpressions);
}
var Io = /\r\n?/g;
function Ue(t) {
	return `Unexpected character "${t === 0 ? "EOF" : String.fromCharCode(t)}"`;
}
function ti(t) {
	return `Unknown entity "${t}" - use the "&#<decimal>;" or  "&#x<hex>;" syntax`;
}
function Ro(t, e) {
	return `Unable to parse entity "${e}" - ${t} character reference entities must end with ";"`;
}
var rr;
(function(t) {
	t.HEX = "hexadecimal", t.DEC = "decimal";
})(rr || (rr = {}));
var Ct = class {
	constructor(e) {
		this.error = e;
	}
};
var Wr = class {
	constructor(e, r, n) {
		this._getTagContentType = r, this._currentTokenStart = null, this._currentTokenType = null, this._expansionCaseStack = [], this._inInterpolation = !1, this._fullNameStack = [], this.tokens = [], this.errors = [], this.nonNormalizedIcuExpressions = [], this._tokenizeIcu = n.tokenizeExpansionForms || !1, this._interpolationConfig = n.interpolationConfig || Or, this._leadingTriviaCodePoints = n.leadingTriviaChars && n.leadingTriviaChars.map((i) => i.codePointAt(0) || 0), this._canSelfClose = n.canSelfClose || !1, this._allowHtmComponentClosingTags = n.allowHtmComponentClosingTags || !1;
		let s = n.range || {
			endPos: e.content.length,
			startPos: 0,
			startLine: 0,
			startCol: 0
		};
		this._cursor = n.escapedString ? new Gr(e, s) : new nr(e, s), this._preserveLineEndings = n.preserveLineEndings || !1, this._i18nNormalizeLineEndingsInICUs = n.i18nNormalizeLineEndingsInICUs || !1, this._tokenizeBlocks = n.tokenizeBlocks ?? !0, this._tokenizeLet = n.tokenizeLet ?? !0;
		try {
			this._cursor.init();
		} catch (i) {
			this.handleError(i);
		}
	}
	_processCarriageReturns(e) {
		return this._preserveLineEndings ? e : e.replace(Io, `
`);
	}
	tokenize() {
		for (; this._cursor.peek() !== 0;) {
			let e = this._cursor.clone();
			try {
				if (this._attemptCharCode(60)) if (this._attemptCharCode(33)) this._attemptStr("[CDATA[") ? this._consumeCdata(e) : this._attemptStr("--") ? this._consumeComment(e) : this._attemptStrCaseInsensitive("doctype") ? this._consumeDocType(e) : this._consumeBogusComment(e);
				else if (this._attemptCharCode(47)) this._consumeTagClose(e);
				else {
					let r = this._cursor.clone();
					this._attemptCharCode(63) ? (this._cursor = r, this._consumeBogusComment(e)) : this._consumeTagOpen(e);
				}
				else this._tokenizeLet && this._cursor.peek() === 64 && !this._inInterpolation && this._attemptStr("@let") ? this._consumeLetDeclaration(e) : this._tokenizeBlocks && this._attemptCharCode(64) ? this._consumeBlockStart(e) : this._tokenizeBlocks && !this._inInterpolation && !this._isInExpansionCase() && !this._isInExpansionForm() && this._attemptCharCode(125) ? this._consumeBlockEnd(e) : this._tokenizeIcu && this._tokenizeExpansionForm() || this._consumeWithInterpolation(5, 8, () => this._isTextEnd(), () => this._isTagStart());
			} catch (r) {
				this.handleError(r);
			}
		}
		this._beginToken(34), this._endToken([]);
	}
	_getBlockName() {
		let e = !1, r = this._cursor.clone();
		return this._attemptCharCodeUntilFn((n) => ut(n) ? !e : si(n) ? (e = !0, !1) : !0), this._cursor.getChars(r).trim();
	}
	_consumeBlockStart(e) {
		this._beginToken(25, e);
		let r = this._endToken([this._getBlockName()]);
		if (this._cursor.peek() === 40) if (this._cursor.advance(), this._consumeBlockParameters(), this._attemptCharCodeUntilFn(b), this._attemptCharCode(41)) this._attemptCharCodeUntilFn(b);
		else {
			r.type = 29;
			return;
		}
		this._attemptCharCode(123) ? (this._beginToken(26), this._endToken([])) : r.type = 29;
	}
	_consumeBlockEnd(e) {
		this._beginToken(27, e), this._endToken([]);
	}
	_consumeBlockParameters() {
		for (this._attemptCharCodeUntilFn(ii); this._cursor.peek() !== 41 && this._cursor.peek() !== 0;) {
			this._beginToken(28);
			let e = this._cursor.clone(), r = null, n = 0;
			for (; this._cursor.peek() !== 59 && this._cursor.peek() !== 0 || r !== null;) {
				let s = this._cursor.peek();
				if (s === 92) this._cursor.advance();
				else if (s === r) r = null;
				else if (r === null && Ot(s)) r = s;
				else if (s === 40 && r === null) n++;
				else if (s === 41 && r === null) {
					if (n === 0) break;
					n > 0 && n--;
				}
				this._cursor.advance();
			}
			this._endToken([this._cursor.getChars(e)]), this._attemptCharCodeUntilFn(ii);
		}
	}
	_consumeLetDeclaration(e) {
		if (this._beginToken(30, e), ut(this._cursor.peek())) this._attemptCharCodeUntilFn(b);
		else {
			let s = this._endToken([this._cursor.getChars(e)]);
			s.type = 33;
			return;
		}
		let r = this._endToken([this._getLetDeclarationName()]);
		if (this._attemptCharCodeUntilFn(b), !this._attemptCharCode(61)) {
			r.type = 33;
			return;
		}
		this._attemptCharCodeUntilFn((s) => b(s) && !$t(s)), this._consumeLetDeclarationValue(), this._cursor.peek() === 59 ? (this._beginToken(32), this._endToken([]), this._cursor.advance()) : (r.type = 33, r.sourceSpan = this._cursor.getSpan(e));
	}
	_getLetDeclarationName() {
		let e = this._cursor.clone(), r = !1;
		return this._attemptCharCodeUntilFn((n) => lt(n) || n === 36 || n === 95 || r && Rt(n) ? (r = !0, !1) : !0), this._cursor.getChars(e).trim();
	}
	_consumeLetDeclarationValue() {
		let e = this._cursor.clone();
		for (this._beginToken(31, e); this._cursor.peek() !== 0;) {
			let r = this._cursor.peek();
			if (r === 59) break;
			Ot(r) && (this._cursor.advance(), this._attemptCharCodeUntilFn((n) => n === 92 ? (this._cursor.advance(), !1) : n === r)), this._cursor.advance();
		}
		this._endToken([this._cursor.getChars(e)]);
	}
	_tokenizeExpansionForm() {
		if (this.isExpansionFormStart()) return this._consumeExpansionFormStart(), !0;
		if (qo(this._cursor.peek()) && this._isInExpansionForm()) return this._consumeExpansionCaseStart(), !0;
		if (this._cursor.peek() === 125) {
			if (this._isInExpansionCase()) return this._consumeExpansionCaseEnd(), !0;
			if (this._isInExpansionForm()) return this._consumeExpansionFormEnd(), !0;
		}
		return !1;
	}
	_beginToken(e, r = this._cursor.clone()) {
		this._currentTokenStart = r, this._currentTokenType = e;
	}
	_endToken(e, r) {
		if (this._currentTokenStart === null) throw new gt("Programming error - attempted to end a token when there was no start to the token", this._currentTokenType, this._cursor.getSpan(r));
		if (this._currentTokenType === null) throw new gt("Programming error - attempted to end a token which has no token type", null, this._cursor.getSpan(this._currentTokenStart));
		let n = {
			type: this._currentTokenType,
			parts: e,
			sourceSpan: (r ?? this._cursor).getSpan(this._currentTokenStart, this._leadingTriviaCodePoints)
		};
		return this.tokens.push(n), this._currentTokenStart = null, this._currentTokenType = null, n;
	}
	_createError(e, r) {
		this._isInExpansionForm() && (e += ` (Do you have an unescaped "{" in your template? Use "{{ '{' }}") to escape it.)`);
		let n = new gt(e, this._currentTokenType, r);
		return this._currentTokenStart = null, this._currentTokenType = null, new Ct(n);
	}
	handleError(e) {
		if (e instanceof St && (e = this._createError(e.msg, this._cursor.getSpan(e.cursor))), e instanceof Ct) this.errors.push(e.error);
		else throw e;
	}
	_attemptCharCode(e) {
		return this._cursor.peek() === e ? (this._cursor.advance(), !0) : !1;
	}
	_attemptCharCodeCaseInsensitive(e) {
		return Ho(this._cursor.peek(), e) ? (this._cursor.advance(), !0) : !1;
	}
	_requireCharCode(e) {
		let r = this._cursor.clone();
		if (!this._attemptCharCode(e)) throw this._createError(Ue(this._cursor.peek()), this._cursor.getSpan(r));
	}
	_attemptStr(e) {
		let r = e.length;
		if (this._cursor.charsLeft() < r) return !1;
		let n = this._cursor.clone();
		for (let s = 0; s < r; s++) if (!this._attemptCharCode(e.charCodeAt(s))) return this._cursor = n, !1;
		return !0;
	}
	_attemptStrCaseInsensitive(e) {
		for (let r = 0; r < e.length; r++) if (!this._attemptCharCodeCaseInsensitive(e.charCodeAt(r))) return !1;
		return !0;
	}
	_requireStr(e) {
		let r = this._cursor.clone();
		if (!this._attemptStr(e)) throw this._createError(Ue(this._cursor.peek()), this._cursor.getSpan(r));
	}
	_requireStrCaseInsensitive(e) {
		let r = this._cursor.clone();
		if (!this._attemptStrCaseInsensitive(e)) throw this._createError(Ue(this._cursor.peek()), this._cursor.getSpan(r));
	}
	_attemptCharCodeUntilFn(e) {
		for (; !e(this._cursor.peek());) this._cursor.advance();
	}
	_requireCharCodeUntilFn(e, r) {
		let n = this._cursor.clone();
		if (this._attemptCharCodeUntilFn(e), this._cursor.diff(n) < r) throw this._createError(Ue(this._cursor.peek()), this._cursor.getSpan(n));
	}
	_attemptUntilChar(e) {
		for (; this._cursor.peek() !== e;) this._cursor.advance();
	}
	_readChar() {
		let e = String.fromCodePoint(this._cursor.peek());
		return this._cursor.advance(), e;
	}
	_consumeEntity(e) {
		this._beginToken(9);
		let r = this._cursor.clone();
		if (this._cursor.advance(), this._attemptCharCode(35)) {
			let n = this._attemptCharCode(120) || this._attemptCharCode(88), s = this._cursor.clone();
			if (this._attemptCharCodeUntilFn(Oo), this._cursor.peek() != 59) {
				this._cursor.advance();
				let a = n ? rr.HEX : rr.DEC;
				throw this._createError(Ro(a, this._cursor.getChars(r)), this._cursor.getSpan());
			}
			let i = this._cursor.getChars(s);
			this._cursor.advance();
			try {
				let a = parseInt(i, n ? 16 : 10);
				this._endToken([String.fromCharCode(a), this._cursor.getChars(r)]);
			} catch {
				throw this._createError(ti(this._cursor.getChars(r)), this._cursor.getSpan());
			}
		} else {
			let n = this._cursor.clone();
			if (this._attemptCharCodeUntilFn(Mo), this._cursor.peek() != 59) this._beginToken(e, r), this._cursor = n, this._endToken(["&"]);
			else {
				let s = this._cursor.getChars(n);
				this._cursor.advance();
				let i = Ve[s];
				if (!i) throw this._createError(ti(s), this._cursor.getSpan(r));
				this._endToken([i, `&${s};`]);
			}
		}
	}
	_consumeRawText(e, r) {
		this._beginToken(e ? 6 : 7);
		let n = [];
		for (;;) {
			let s = this._cursor.clone(), i = r();
			if (this._cursor = s, i) break;
			e && this._cursor.peek() === 38 ? (this._endToken([this._processCarriageReturns(n.join(""))]), n.length = 0, this._consumeEntity(6), this._beginToken(6)) : n.push(this._readChar());
		}
		this._endToken([this._processCarriageReturns(n.join(""))]);
	}
	_consumeComment(e) {
		this._beginToken(10, e), this._endToken([]), this._consumeRawText(!1, () => this._attemptStr("-->")), this._beginToken(11), this._requireStr("-->"), this._endToken([]);
	}
	_consumeBogusComment(e) {
		this._beginToken(10, e), this._endToken([]), this._consumeRawText(!1, () => this._cursor.peek() === 62), this._beginToken(11), this._cursor.advance(), this._endToken([]);
	}
	_consumeCdata(e) {
		this._beginToken(12, e), this._endToken([]), this._consumeRawText(!1, () => this._attemptStr("]]>")), this._beginToken(13), this._requireStr("]]>"), this._endToken([]);
	}
	_consumeDocType(e) {
		this._beginToken(18, e), this._endToken([]), this._consumeRawText(!1, () => this._cursor.peek() === 62), this._beginToken(19), this._cursor.advance(), this._endToken([]);
	}
	_consumePrefixAndName() {
		let e = this._cursor.clone(), r = "";
		for (; this._cursor.peek() !== 58 && !$o(this._cursor.peek());) this._cursor.advance();
		let n;
		this._cursor.peek() === 58 ? (r = this._cursor.getChars(e), this._cursor.advance(), n = this._cursor.clone()) : n = e, this._requireCharCodeUntilFn(ri, r === "" ? 0 : 1);
		let s = this._cursor.getChars(n);
		return [r, s];
	}
	_consumeTagOpen(e) {
		let r, n, s, i = [];
		try {
			if (!lt(this._cursor.peek())) throw this._createError(Ue(this._cursor.peek()), this._cursor.getSpan(e));
			for (s = this._consumeTagOpenStart(e), n = s.parts[0], r = s.parts[1], this._attemptCharCodeUntilFn(b); this._cursor.peek() !== 47 && this._cursor.peek() !== 62 && this._cursor.peek() !== 60 && this._cursor.peek() !== 0;) {
				let [o, u] = this._consumeAttributeName();
				if (this._attemptCharCodeUntilFn(b), this._attemptCharCode(61)) {
					this._attemptCharCodeUntilFn(b);
					let p = this._consumeAttributeValue();
					i.push({
						prefix: o,
						name: u,
						value: p
					});
				} else i.push({
					prefix: o,
					name: u
				});
				this._attemptCharCodeUntilFn(b);
			}
			this._consumeTagOpenEnd();
		} catch (o) {
			if (o instanceof Ct) {
				s ? s.type = 4 : (this._beginToken(5, e), this._endToken(["<"]));
				return;
			}
			throw o;
		}
		if (this._canSelfClose && this.tokens[this.tokens.length - 1].type === 2) return;
		let a = this._getTagContentType(r, n, this._fullNameStack.length > 0, i);
		this._handleFullNameStackForTagOpen(n, r), a === N.RAW_TEXT ? this._consumeRawTextWithTagClose(n, r, !1) : a === N.ESCAPABLE_RAW_TEXT && this._consumeRawTextWithTagClose(n, r, !0);
	}
	_consumeRawTextWithTagClose(e, r, n) {
		this._consumeRawText(n, () => !this._attemptCharCode(60) || !this._attemptCharCode(47) || (this._attemptCharCodeUntilFn(b), !this._attemptStrCaseInsensitive(e ? `${e}:${r}` : r)) ? !1 : (this._attemptCharCodeUntilFn(b), this._attemptCharCode(62))), this._beginToken(3), this._requireCharCodeUntilFn((s) => s === 62, 3), this._cursor.advance(), this._endToken([e, r]), this._handleFullNameStackForTagClose(e, r);
	}
	_consumeTagOpenStart(e) {
		this._beginToken(0, e);
		let r = this._consumePrefixAndName();
		return this._endToken(r);
	}
	_consumeAttributeName() {
		let e = this._cursor.peek();
		if (e === 39 || e === 34) throw this._createError(Ue(e), this._cursor.getSpan());
		this._beginToken(14);
		let r = this._consumePrefixAndName();
		return this._endToken(r), r;
	}
	_consumeAttributeValue() {
		let e;
		if (this._cursor.peek() === 39 || this._cursor.peek() === 34) {
			let r = this._cursor.peek();
			this._consumeQuote(r);
			let n = () => this._cursor.peek() === r;
			e = this._consumeWithInterpolation(16, 17, n, n), this._consumeQuote(r);
		} else {
			let r = () => ri(this._cursor.peek());
			e = this._consumeWithInterpolation(16, 17, r, r);
		}
		return e;
	}
	_consumeQuote(e) {
		this._beginToken(15), this._requireCharCode(e), this._endToken([String.fromCodePoint(e)]);
	}
	_consumeTagOpenEnd() {
		let e = this._attemptCharCode(47) ? 2 : 1;
		this._beginToken(e), this._requireCharCode(62), this._endToken([]);
	}
	_consumeTagClose(e) {
		if (this._beginToken(3, e), this._attemptCharCodeUntilFn(b), this._allowHtmComponentClosingTags && this._attemptCharCode(47)) this._attemptCharCodeUntilFn(b), this._requireCharCode(62), this._endToken([]);
		else {
			let [r, n] = this._consumePrefixAndName();
			this._attemptCharCodeUntilFn(b), this._requireCharCode(62), this._endToken([r, n]), this._handleFullNameStackForTagClose(r, n);
		}
	}
	_consumeExpansionFormStart() {
		this._beginToken(20), this._requireCharCode(123), this._endToken([]), this._expansionCaseStack.push(20), this._beginToken(7);
		let e = this._readUntil(44), r = this._processCarriageReturns(e);
		if (this._i18nNormalizeLineEndingsInICUs) this._endToken([r]);
		else {
			let s = this._endToken([e]);
			r !== e && this.nonNormalizedIcuExpressions.push(s);
		}
		this._requireCharCode(44), this._attemptCharCodeUntilFn(b), this._beginToken(7);
		let n = this._readUntil(44);
		this._endToken([n]), this._requireCharCode(44), this._attemptCharCodeUntilFn(b);
	}
	_consumeExpansionCaseStart() {
		this._beginToken(21);
		let e = this._readUntil(123).trim();
		this._endToken([e]), this._attemptCharCodeUntilFn(b), this._beginToken(22), this._requireCharCode(123), this._endToken([]), this._attemptCharCodeUntilFn(b), this._expansionCaseStack.push(22);
	}
	_consumeExpansionCaseEnd() {
		this._beginToken(23), this._requireCharCode(125), this._endToken([]), this._attemptCharCodeUntilFn(b), this._expansionCaseStack.pop();
	}
	_consumeExpansionFormEnd() {
		this._beginToken(24), this._requireCharCode(125), this._endToken([]), this._expansionCaseStack.pop();
	}
	_consumeWithInterpolation(e, r, n, s) {
		this._beginToken(e);
		let i = [];
		for (; !n();) {
			let o = this._cursor.clone();
			this._interpolationConfig && this._attemptStr(this._interpolationConfig.start) ? (this._endToken([this._processCarriageReturns(i.join(""))], o), i.length = 0, this._consumeInterpolation(r, o, s), this._beginToken(e)) : this._cursor.peek() === 38 ? (this._endToken([this._processCarriageReturns(i.join(""))]), i.length = 0, this._consumeEntity(e), this._beginToken(e)) : i.push(this._readChar());
		}
		this._inInterpolation = !1;
		let a = this._processCarriageReturns(i.join(""));
		return this._endToken([a]), a;
	}
	_consumeInterpolation(e, r, n) {
		let s = [];
		this._beginToken(e, r), s.push(this._interpolationConfig.start);
		let i = this._cursor.clone(), a = null, o = !1;
		for (; this._cursor.peek() !== 0 && (n === null || !n());) {
			let u = this._cursor.clone();
			if (this._isTagStart()) {
				this._cursor = u, s.push(this._getProcessedChars(i, u)), this._endToken(s);
				return;
			}
			if (a === null) if (this._attemptStr(this._interpolationConfig.end)) {
				s.push(this._getProcessedChars(i, u)), s.push(this._interpolationConfig.end), this._endToken(s);
				return;
			} else this._attemptStr("//") && (o = !0);
			let p = this._cursor.peek();
			this._cursor.advance(), p === 92 ? this._cursor.advance() : p === a ? a = null : !o && a === null && Ot(p) && (a = p);
		}
		s.push(this._getProcessedChars(i, this._cursor)), this._endToken(s);
	}
	_getProcessedChars(e, r) {
		return this._processCarriageReturns(r.getChars(e));
	}
	_isTextEnd() {
		return !!(this._isTagStart() || this._cursor.peek() === 0 || this._tokenizeIcu && !this._inInterpolation && (this.isExpansionFormStart() || this._cursor.peek() === 125 && this._isInExpansionCase()) || this._tokenizeBlocks && !this._inInterpolation && !this._isInExpansion() && (this._isBlockStart() || this._cursor.peek() === 64 || this._cursor.peek() === 125));
	}
	_isTagStart() {
		if (this._cursor.peek() === 60) {
			let e = this._cursor.clone();
			e.advance();
			let r = e.peek();
			if (97 <= r && r <= 122 || 65 <= r && r <= 90 || r === 47 || r === 33) return !0;
		}
		return !1;
	}
	_isBlockStart() {
		if (this._tokenizeBlocks && this._cursor.peek() === 64) {
			let e = this._cursor.clone();
			if (e.advance(), si(e.peek())) return !0;
		}
		return !1;
	}
	_readUntil(e) {
		let r = this._cursor.clone();
		return this._attemptUntilChar(e), this._cursor.getChars(r);
	}
	_isInExpansion() {
		return this._isInExpansionCase() || this._isInExpansionForm();
	}
	_isInExpansionCase() {
		return this._expansionCaseStack.length > 0 && this._expansionCaseStack[this._expansionCaseStack.length - 1] === 22;
	}
	_isInExpansionForm() {
		return this._expansionCaseStack.length > 0 && this._expansionCaseStack[this._expansionCaseStack.length - 1] === 20;
	}
	isExpansionFormStart() {
		if (this._cursor.peek() !== 123) return !1;
		if (this._interpolationConfig) {
			let e = this._cursor.clone(), r = this._attemptStr(this._interpolationConfig.start);
			return this._cursor = e, !r;
		}
		return !0;
	}
	_handleFullNameStackForTagOpen(e, r) {
		let n = qe(e, r);
		(this._fullNameStack.length === 0 || this._fullNameStack[this._fullNameStack.length - 1] === n) && this._fullNameStack.push(n);
	}
	_handleFullNameStackForTagClose(e, r) {
		let n = qe(e, r);
		this._fullNameStack.length !== 0 && this._fullNameStack[this._fullNameStack.length - 1] === n && this._fullNameStack.pop();
	}
};
function b(t) {
	return !ut(t) || t === 0;
}
function ri(t) {
	return ut(t) || t === 62 || t === 60 || t === 47 || t === 39 || t === 34 || t === 61 || t === 0;
}
function $o(t) {
	return (t < 97 || 122 < t) && (t < 65 || 90 < t) && (t < 48 || t > 57);
}
function Oo(t) {
	return t === 59 || t === 0 || !Rs(t);
}
function Mo(t) {
	return t === 59 || t === 0 || !lt(t);
}
function qo(t) {
	return t !== 125;
}
function Ho(t, e) {
	return ni(t) === ni(e);
}
function ni(t) {
	return t >= 97 && t <= 122 ? t - 97 + 65 : t;
}
function si(t) {
	return lt(t) || Rt(t) || t === 95;
}
function ii(t) {
	return t !== 59 && b(t);
}
function Vo(t) {
	let e = [], r;
	for (let n = 0; n < t.length; n++) {
		let s = t[n];
		r && r.type === 5 && s.type === 5 || r && r.type === 16 && s.type === 16 ? (r.parts[0] += s.parts[0], r.sourceSpan.end = s.sourceSpan.end) : (r = s, e.push(r));
	}
	return e;
}
var nr = class t {
	constructor(e, r) {
		if (e instanceof t) {
			this.file = e.file, this.input = e.input, this.end = e.end;
			let n = e.state;
			this.state = {
				peek: n.peek,
				offset: n.offset,
				line: n.line,
				column: n.column
			};
		} else {
			if (!r) throw new Error("Programming error: the range argument must be provided with a file argument.");
			this.file = e, this.input = e.content, this.end = r.endPos, this.state = {
				peek: -1,
				offset: r.startPos,
				line: r.startLine,
				column: r.startCol
			};
		}
	}
	clone() {
		return new t(this);
	}
	peek() {
		return this.state.peek;
	}
	charsLeft() {
		return this.end - this.state.offset;
	}
	diff(e) {
		return this.state.offset - e.state.offset;
	}
	advance() {
		this.advanceState(this.state);
	}
	init() {
		this.updatePeek(this.state);
	}
	getSpan(e, r) {
		e = e || this;
		let n = e;
		if (r) for (; this.diff(e) > 0 && r.indexOf(e.peek()) !== -1;) n === e && (e = e.clone()), e.advance();
		let s = this.locationFromCursor(e);
		return new h(s, this.locationFromCursor(this), n !== e ? this.locationFromCursor(n) : s);
	}
	getChars(e) {
		return this.input.substring(e.state.offset, this.state.offset);
	}
	charAt(e) {
		return this.input.charCodeAt(e);
	}
	advanceState(e) {
		if (e.offset >= this.end) throw this.state = e, new St("Unexpected character \"EOF\"", this);
		let r = this.charAt(e.offset);
		r === 10 ? (e.line++, e.column = 0) : $t(r) || e.column++, e.offset++, this.updatePeek(e);
	}
	updatePeek(e) {
		e.peek = e.offset >= this.end ? 0 : this.charAt(e.offset);
	}
	locationFromCursor(e) {
		return new ie(e.file, e.state.offset, e.state.line, e.state.column);
	}
};
var Gr = class t extends nr {
	constructor(e, r) {
		e instanceof t ? (super(e), this.internalState = { ...e.internalState }) : (super(e, r), this.internalState = this.state);
	}
	advance() {
		this.state = this.internalState, super.advance(), this.processEscapeSequence();
	}
	init() {
		super.init(), this.processEscapeSequence();
	}
	clone() {
		return new t(this);
	}
	getChars(e) {
		let r = e.clone(), n = "";
		for (; r.internalState.offset < this.internalState.offset;) n += String.fromCodePoint(r.peek()), r.advance();
		return n;
	}
	processEscapeSequence() {
		let e = () => this.internalState.peek;
		if (e() === 92) if (this.internalState = { ...this.state }, this.advanceState(this.internalState), e() === 110) this.state.peek = 10;
		else if (e() === 114) this.state.peek = 13;
		else if (e() === 118) this.state.peek = 11;
		else if (e() === 116) this.state.peek = 9;
		else if (e() === 98) this.state.peek = 8;
		else if (e() === 102) this.state.peek = 12;
		else if (e() === 117) if (this.advanceState(this.internalState), e() === 123) {
			this.advanceState(this.internalState);
			let r = this.clone(), n = 0;
			for (; e() !== 125;) this.advanceState(this.internalState), n++;
			this.state.peek = this.decodeHexDigits(r, n);
		} else {
			let r = this.clone();
			this.advanceState(this.internalState), this.advanceState(this.internalState), this.advanceState(this.internalState), this.state.peek = this.decodeHexDigits(r, 4);
		}
		else if (e() === 120) {
			this.advanceState(this.internalState);
			let r = this.clone();
			this.advanceState(this.internalState), this.state.peek = this.decodeHexDigits(r, 2);
		} else if (Br(e())) {
			let r = "", n = 0, s = this.clone();
			for (; Br(e()) && n < 3;) s = this.clone(), r += String.fromCodePoint(e()), this.advanceState(this.internalState), n++;
			this.state.peek = parseInt(r, 8), this.internalState = s.internalState;
		} else $t(this.internalState.peek) ? (this.advanceState(this.internalState), this.state = this.internalState) : this.state.peek = this.internalState.peek;
	}
	decodeHexDigits(e, r) {
		let n = this.input.slice(e.internalState.offset, e.internalState.offset + r), s = parseInt(n, 16);
		if (isNaN(s)) throw e.state = e.internalState, new St("Invalid hexadecimal escape sequence", e);
		return s;
	}
};
var St = class {
	constructor(e, r) {
		this.msg = e, this.cursor = r;
	}
};
var L = class t extends Oe {
	static create(e, r, n) {
		return new t(e, r, n);
	}
	constructor(e, r, n) {
		super(r, n), this.elementName = e;
	}
};
var jr = class {
	constructor(e, r) {
		this.rootNodes = e, this.errors = r;
	}
};
var sr = class {
	constructor(e) {
		this.getTagDefinition = e;
	}
	parse(e, r, n, s = !1, i) {
		let a = (D) => (I, ...F) => D(I.toLowerCase(), ...F), o = s ? this.getTagDefinition : a(this.getTagDefinition), u = (D) => o(D).getContentType(), p = s ? i : a(i), m = li(e, r, i ? (D, I, F, c) => {
			let g = p(D, I, F, c);
			return g !== void 0 ? g : u(D);
		} : u, n), f = n && n.canSelfClose || !1, C = n && n.allowHtmComponentClosingTags || !1, A = new Kr(m.tokens, o, f, C, s);
		return A.build(), new jr(A.rootNodes, m.errors.concat(A.errors));
	}
};
var Kr = class t {
	constructor(e, r, n, s, i) {
		this.tokens = e, this.getTagDefinition = r, this.canSelfClose = n, this.allowHtmComponentClosingTags = s, this.isTagNameCaseSensitive = i, this._index = -1, this._containerStack = [], this.rootNodes = [], this.errors = [], this._advance();
	}
	build() {
		for (; this._peek.type !== 34;) this._peek.type === 0 || this._peek.type === 4 ? this._consumeStartTag(this._advance()) : this._peek.type === 3 ? (this._closeVoidElement(), this._consumeEndTag(this._advance())) : this._peek.type === 12 ? (this._closeVoidElement(), this._consumeCdata(this._advance())) : this._peek.type === 10 ? (this._closeVoidElement(), this._consumeComment(this._advance())) : this._peek.type === 5 || this._peek.type === 7 || this._peek.type === 6 ? (this._closeVoidElement(), this._consumeText(this._advance())) : this._peek.type === 20 ? this._consumeExpansion(this._advance()) : this._peek.type === 25 ? (this._closeVoidElement(), this._consumeBlockOpen(this._advance())) : this._peek.type === 27 ? (this._closeVoidElement(), this._consumeBlockClose(this._advance())) : this._peek.type === 29 ? (this._closeVoidElement(), this._consumeIncompleteBlock(this._advance())) : this._peek.type === 30 ? (this._closeVoidElement(), this._consumeLet(this._advance())) : this._peek.type === 18 ? this._consumeDocType(this._advance()) : this._peek.type === 33 ? (this._closeVoidElement(), this._consumeIncompleteLet(this._advance())) : this._advance();
		for (let e of this._containerStack) e instanceof ee && this.errors.push(L.create(e.name, e.sourceSpan, `Unclosed block "${e.name}"`));
	}
	_advance() {
		let e = this._peek;
		return this._index < this.tokens.length - 1 && this._index++, this._peek = this.tokens[this._index], e;
	}
	_advanceIf(e) {
		return this._peek.type === e ? this._advance() : null;
	}
	_consumeCdata(e) {
		let r = this._advance(), n = this._getText(r), s = this._advanceIf(13);
		this._addToParent(new Gt(n, new h(e.sourceSpan.start, (s || r).sourceSpan.end), [r]));
	}
	_consumeComment(e) {
		let r = this._advanceIf(7), n = this._advanceIf(11), s = r != null ? r.parts[0].trim() : null, i = n == null ? e.sourceSpan : new h(e.sourceSpan.start, n.sourceSpan.end, e.sourceSpan.fullStart);
		this._addToParent(new Kt(s, i));
	}
	_consumeDocType(e) {
		let r = this._advanceIf(7), n = this._advanceIf(19), s = r != null ? r.parts[0].trim() : null, i = new h(e.sourceSpan.start, (n || r || e).sourceSpan.end);
		this._addToParent(new Xt(s, i));
	}
	_consumeExpansion(e) {
		let r = this._advance(), n = this._advance(), s = [];
		for (; this._peek.type === 21;) {
			let a = this._parseExpansionCase();
			if (!a) return;
			s.push(a);
		}
		if (this._peek.type !== 24) {
			this.errors.push(L.create(null, this._peek.sourceSpan, "Invalid ICU message. Missing '}'."));
			return;
		}
		let i = new h(e.sourceSpan.start, this._peek.sourceSpan.end, e.sourceSpan.fullStart);
		this._addToParent(new zt(r.parts[0], n.parts[0], s, i, r.sourceSpan)), this._advance();
	}
	_parseExpansionCase() {
		let e = this._advance();
		if (this._peek.type !== 22) return this.errors.push(L.create(null, this._peek.sourceSpan, "Invalid ICU message. Missing '{'.")), null;
		let r = this._advance(), n = this._collectExpansionExpTokens(r);
		if (!n) return null;
		let s = this._advance();
		n.push({
			type: 34,
			parts: [],
			sourceSpan: s.sourceSpan
		});
		let i = new t(n, this.getTagDefinition, this.canSelfClose, this.allowHtmComponentClosingTags, this.isTagNameCaseSensitive);
		if (i.build(), i.errors.length > 0) return this.errors = this.errors.concat(i.errors), null;
		let a = new h(e.sourceSpan.start, s.sourceSpan.end, e.sourceSpan.fullStart), o = new h(r.sourceSpan.start, s.sourceSpan.end, r.sourceSpan.fullStart);
		return new Yt(e.parts[0], i.rootNodes, a, e.sourceSpan, o);
	}
	_collectExpansionExpTokens(e) {
		let r = [], n = [22];
		for (;;) {
			if ((this._peek.type === 20 || this._peek.type === 22) && n.push(this._peek.type), this._peek.type === 23) if (ci(n, 22)) {
				if (n.pop(), n.length === 0) return r;
			} else return this.errors.push(L.create(null, e.sourceSpan, "Invalid ICU message. Missing '}'.")), null;
			if (this._peek.type === 24) if (ci(n, 20)) n.pop();
			else return this.errors.push(L.create(null, e.sourceSpan, "Invalid ICU message. Missing '}'.")), null;
			if (this._peek.type === 34) return this.errors.push(L.create(null, e.sourceSpan, "Invalid ICU message. Missing '}'.")), null;
			r.push(this._advance());
		}
	}
	_getText(e) {
		let r = e.parts[0];
		if (r.length > 0 && r[0] == `
`) {
			let n = this._getClosestParentElement();
			n != null && n.children.length == 0 && this.getTagDefinition(n.name).ignoreFirstLf && (r = r.substring(1));
		}
		return r;
	}
	_consumeText(e) {
		let r = [e], n = e.sourceSpan, s = e.parts[0];
		if (s.length > 0 && s[0] === `
`) {
			let i = this._getContainer();
			i != null && i.children.length === 0 && this.getTagDefinition(i.name).ignoreFirstLf && (s = s.substring(1), r[0] = {
				type: e.type,
				sourceSpan: e.sourceSpan,
				parts: [s]
			});
		}
		for (; this._peek.type === 8 || this._peek.type === 5 || this._peek.type === 9;) e = this._advance(), r.push(e), e.type === 8 ? s += e.parts.join("").replace(/&([^;]+);/g, pi) : e.type === 9 ? s += e.parts[0] : s += e.parts.join("");
		if (s.length > 0) {
			let i = e.sourceSpan;
			this._addToParent(new Wt(s, new h(n.start, i.end, n.fullStart, n.details), r));
		}
	}
	_closeVoidElement() {
		let e = this._getContainer();
		e instanceof Y && this.getTagDefinition(e.name).isVoid && this._containerStack.pop();
	}
	_consumeStartTag(e) {
		let [r, n] = e.parts, s = [];
		for (; this._peek.type === 14;) s.push(this._consumeAttr(this._advance()));
		let i = this._getElementFullName(r, n, this._getClosestParentElement()), a = !1;
		if (this._peek.type === 2) {
			this._advance(), a = !0;
			let C = this.getTagDefinition(i);
			this.canSelfClose || C.canSelfClose || Me(i) !== null || C.isVoid || this.errors.push(L.create(i, e.sourceSpan, `Only void, custom and foreign elements can be self closed "${e.parts[1]}"`));
		} else this._peek.type === 1 && (this._advance(), a = !1);
		let o = this._peek.sourceSpan.fullStart, u = new h(e.sourceSpan.start, o, e.sourceSpan.fullStart), m = new Y(i, s, [], u, new h(e.sourceSpan.start, o, e.sourceSpan.fullStart), void 0, new h(e.sourceSpan.start.moveBy(1), e.sourceSpan.end)), f = this._getContainer();
		this._pushContainer(m, f instanceof Y && this.getTagDefinition(f.name).isClosedByChild(m.name)), a ? this._popContainer(i, Y, u) : e.type === 4 && (this._popContainer(i, Y, null), this.errors.push(L.create(i, u, `Opening tag "${i}" not terminated.`)));
	}
	_pushContainer(e, r) {
		r && this._containerStack.pop(), this._addToParent(e), this._containerStack.push(e);
	}
	_consumeEndTag(e) {
		let r = this.allowHtmComponentClosingTags && e.parts.length === 0 ? null : this._getElementFullName(e.parts[0], e.parts[1], this._getClosestParentElement());
		if (r && this.getTagDefinition(r).isVoid) this.errors.push(L.create(r, e.sourceSpan, `Void elements do not have end tags "${e.parts[1]}"`));
		else if (!this._popContainer(r, Y, e.sourceSpan)) {
			let n = `Unexpected closing tag "${r}". It may happen when the tag has already been closed by another tag. For more info see https://www.w3.org/TR/html5/syntax.html#closing-elements-that-have-implied-end-tags`;
			this.errors.push(L.create(r, e.sourceSpan, n));
		}
	}
	_popContainer(e, r, n) {
		let s = !1;
		for (let i = this._containerStack.length - 1; i >= 0; i--) {
			let a = this._containerStack[i];
			if (Me(a.name) ? a.name === e : (e == null || a.name.toLowerCase() === e.toLowerCase()) && a instanceof r) return a.endSourceSpan = n, a.sourceSpan.end = n !== null ? n.end : a.sourceSpan.end, this._containerStack.splice(i, this._containerStack.length - i), !s;
			(a instanceof ee || a instanceof Y && !this.getTagDefinition(a.name).closedByParent) && (s = !0);
		}
		return !1;
	}
	_consumeAttr(e) {
		let r = qe(e.parts[0], e.parts[1]), n = e.sourceSpan.end, s;
		this._peek.type === 15 && (s = this._advance());
		let i = "", a = [], o, u;
		if (this._peek.type === 16) for (o = this._peek.sourceSpan, u = this._peek.sourceSpan.end; this._peek.type === 16 || this._peek.type === 17 || this._peek.type === 9;) {
			let m = this._advance();
			a.push(m), m.type === 17 ? i += m.parts.join("").replace(/&([^;]+);/g, pi) : m.type === 9 ? i += m.parts[0] : i += m.parts.join(""), u = n = m.sourceSpan.end;
		}
		this._peek.type === 15 && (u = n = this._advance().sourceSpan.end);
		let l = o && u && new h((s == null ? void 0 : s.sourceSpan.start) ?? o.start, u, (s == null ? void 0 : s.sourceSpan.fullStart) ?? o.fullStart);
		return new jt(r, i, new h(e.sourceSpan.start, n, e.sourceSpan.fullStart), e.sourceSpan, l, a.length > 0 ? a : void 0, void 0);
	}
	_consumeBlockOpen(e) {
		let r = [];
		for (; this._peek.type === 28;) {
			let o = this._advance();
			r.push(new ht(o.parts[0], o.sourceSpan));
		}
		this._peek.type === 26 && this._advance();
		let n = this._peek.sourceSpan.fullStart, s = new h(e.sourceSpan.start, n, e.sourceSpan.fullStart), i = new h(e.sourceSpan.start, n, e.sourceSpan.fullStart), a = new ee(e.parts[0], r, [], s, e.sourceSpan, i);
		this._pushContainer(a, !1);
	}
	_consumeBlockClose(e) {
		this._popContainer(null, ee, e.sourceSpan) || this.errors.push(L.create(null, e.sourceSpan, "Unexpected closing block. The block may have been closed earlier. If you meant to write the } character, you should use the \"&#125;\" HTML entity instead."));
	}
	_consumeIncompleteBlock(e) {
		let r = [];
		for (; this._peek.type === 28;) {
			let o = this._advance();
			r.push(new ht(o.parts[0], o.sourceSpan));
		}
		let n = this._peek.sourceSpan.fullStart, s = new h(e.sourceSpan.start, n, e.sourceSpan.fullStart), i = new h(e.sourceSpan.start, n, e.sourceSpan.fullStart), a = new ee(e.parts[0], r, [], s, e.sourceSpan, i);
		this._pushContainer(a, !1), this._popContainer(null, ee, null), this.errors.push(L.create(e.parts[0], s, `Incomplete block "${e.parts[0]}". If you meant to write the @ character, you should use the "&#64;" HTML entity instead.`));
	}
	_consumeLet(e) {
		let r = e.parts[0], n, s;
		if (this._peek.type !== 31) {
			this.errors.push(L.create(e.parts[0], e.sourceSpan, `Invalid @let declaration "${r}". Declaration must have a value.`));
			return;
		} else n = this._advance();
		if (this._peek.type !== 32) {
			this.errors.push(L.create(e.parts[0], e.sourceSpan, `Unterminated @let declaration "${r}". Declaration must be terminated with a semicolon.`));
			return;
		} else s = this._advance();
		let i = s.sourceSpan.fullStart, a = new h(e.sourceSpan.start, i, e.sourceSpan.fullStart), o = e.sourceSpan.toString().lastIndexOf(r), p = new h(e.sourceSpan.start.moveBy(o), e.sourceSpan.end), l = new mt(r, n.parts[0], a, p, n.sourceSpan);
		this._addToParent(l);
	}
	_consumeIncompleteLet(e) {
		let r = e.parts[0] ?? "", n = r ? ` "${r}"` : "";
		if (r.length > 0) {
			let s = e.sourceSpan.toString().lastIndexOf(r), a = new h(e.sourceSpan.start.moveBy(s), e.sourceSpan.end), o = new h(e.sourceSpan.start, e.sourceSpan.start.moveBy(0)), u = new mt(r, "", e.sourceSpan, a, o);
			this._addToParent(u);
		}
		this.errors.push(L.create(e.parts[0], e.sourceSpan, `Incomplete @let declaration${n}. @let declarations must be written as \`@let <name> = <value>;\``));
	}
	_getContainer() {
		return this._containerStack.length > 0 ? this._containerStack[this._containerStack.length - 1] : null;
	}
	_getClosestParentElement() {
		for (let e = this._containerStack.length - 1; e > -1; e--) if (this._containerStack[e] instanceof Y) return this._containerStack[e];
		return null;
	}
	_addToParent(e) {
		let r = this._getContainer();
		r === null ? this.rootNodes.push(e) : r.children.push(e);
	}
	_getElementFullName(e, r, n) {
		if (e === "" && (e = this.getTagDefinition(r).implicitNamespacePrefix || "", e === "" && n != null)) {
			let s = ct(n.name)[1];
			this.getTagDefinition(s).preventNamespaceInheritance || (e = Me(n.name));
		}
		return qe(e, r);
	}
};
function ci(t, e) {
	return t.length > 0 && t[t.length - 1] === e;
}
function pi(t, e) {
	return Ve[e] !== void 0 ? Ve[e] || t : /^#x[a-f0-9]+$/i.test(e) ? String.fromCodePoint(parseInt(e.slice(2), 16)) : /^#\d+$/.test(e) ? String.fromCodePoint(parseInt(e.slice(1), 10)) : t;
}
var ir = class extends sr {
	constructor() {
		super(He);
	}
	parse(e, r, n, s = !1, i) {
		return super.parse(e, r, n, s, i);
	}
};
var Xr = null;
var Uo = () => (Xr || (Xr = new ir()), Xr);
function Qr(t, e = {}) {
	let { canSelfClose: r = !1, allowHtmComponentClosingTags: n = !1, isTagNameCaseSensitive: s = !1, getTagContentType: i, tokenizeAngularBlocks: a = !1, tokenizeAngularLetDeclaration: o = !1 } = e;
	return Uo().parse(t, "angular-html-parser", {
		tokenizeExpansionForms: a,
		interpolationConfig: void 0,
		canSelfClose: r,
		allowHtmComponentClosingTags: n,
		tokenizeBlocks: a,
		tokenizeLet: o
	}, s, i);
}
function Wo(t, e) {
	let r = /* @__PURE__ */ new SyntaxError(t + " (" + e.loc.start.line + ":" + e.loc.start.column + ")");
	return Object.assign(r, e);
}
var hi = Wo;
var _t = 3;
function Go(t) {
	let e = t.slice(0, _t);
	if (e !== "---" && e !== "+++") return;
	let r = t.indexOf(`
`, _t);
	if (r === -1) return;
	let n = t.slice(_t, r).trim(), s = t.indexOf(`
${e}`, r), i = n;
	if (i || (i = e === "+++" ? "toml" : "yaml"), s === -1 && e === "---" && i === "yaml" && (s = t.indexOf(`
...`, r)), s === -1) return;
	let a = s + 1 + _t, o = t.charAt(a + 1);
	if (!/\s?/u.test(o)) return;
	let u = t.slice(0, a);
	return {
		type: "front-matter",
		language: i,
		explicitLanguage: n,
		value: t.slice(r + 1, s),
		startDelimiter: e,
		endDelimiter: u.slice(-_t),
		raw: u
	};
}
function zo(t) {
	let e = Go(t);
	if (!e) return { content: t };
	let { raw: r } = e;
	return {
		frontMatter: e,
		content: w(!1, r, /[^\n]/gu, " ") + t.slice(r.length)
	};
}
var mi = zo;
var ar = {
	attrs: !0,
	children: !0,
	cases: !0,
	expression: !0
};
var fi = /* @__PURE__ */ new Set(["parent"]);
var le;
var Jr;
var Zr;
var Ge = class Ge {
	constructor(e = {}) {
		At(this, le);
		lr(this, "type");
		lr(this, "parent");
		for (let r of /* @__PURE__ */ new Set([...fi, ...Object.keys(e)])) this.setProperty(r, e[r]);
	}
	setProperty(e, r) {
		if (this[e] !== r) {
			if (e in ar && (r = r.map((n) => this.createChild(n))), !fi.has(e)) {
				this[e] = r;
				return;
			}
			Object.defineProperty(this, e, {
				value: r,
				enumerable: !1,
				configurable: !0
			});
		}
	}
	map(e) {
		let r;
		for (let n in ar) {
			let s = this[n];
			if (s) {
				let i = Yo(s, (a) => a.map(e));
				r !== s && (r || (r = new Ge({ parent: this.parent })), r.setProperty(n, i));
			}
		}
		if (r) for (let n in this) n in ar || (r[n] = this[n]);
		return e(r || this);
	}
	walk(e) {
		for (let r in ar) {
			let n = this[r];
			if (n) for (let s = 0; s < n.length; s++) n[s].walk(e);
		}
		e(this);
	}
	createChild(e) {
		let r = e instanceof Ge ? e.clone() : new Ge(e);
		return r.setProperty("parent", this), r;
	}
	insertChildBefore(e, r) {
		let n = this.$children;
		n.splice(n.indexOf(e), 0, this.createChild(r));
	}
	removeChild(e) {
		let r = this.$children;
		r.splice(r.indexOf(e), 1);
	}
	replaceChild(e, r) {
		let n = this.$children;
		n[n.indexOf(e)] = this.createChild(r);
	}
	clone() {
		return new Ge(this);
	}
	get $children() {
		return this[R(this, le, Jr)];
	}
	set $children(e) {
		this[R(this, le, Jr)] = e;
	}
	get firstChild() {
		var e;
		return (e = this.$children) == null ? void 0 : e[0];
	}
	get lastChild() {
		return K(!0, this.$children, -1);
	}
	get prev() {
		let e = R(this, le, Zr);
		return e[e.indexOf(this) - 1];
	}
	get next() {
		let e = R(this, le, Zr);
		return e[e.indexOf(this) + 1];
	}
	get rawName() {
		return this.hasExplicitNamespace ? this.fullName : this.name;
	}
	get fullName() {
		return this.namespace ? this.namespace + ":" + this.name : this.name;
	}
	get attrMap() {
		return Object.fromEntries(this.attrs.map((e) => [e.fullName, e.value]));
	}
};
le = /* @__PURE__ */ new WeakSet(), Jr = function() {
	return this.type === "angularIcuCase" ? "expression" : this.type === "angularIcuExpression" ? "cases" : "children";
}, Zr = function() {
	var e;
	return ((e = this.parent) == null ? void 0 : e.$children) ?? [];
};
var or = Ge;
function Yo(t, e) {
	let r = t.map(e);
	return r.some((n, s) => n !== t[s]) ? r : t;
}
var jo = [
	{
		regex: /^(\[if([^\]]*)\]>)(.*?)<!\s*\[endif\]$/su,
		parse: Ko
	},
	{
		regex: /^\[if([^\]]*)\]><!$/u,
		parse: Xo
	},
	{
		regex: /^<!\s*\[endif\]$/u,
		parse: Qo
	}
];
function di(t, e) {
	if (t.value) for (let { regex: r, parse: n } of jo) {
		let s = t.value.match(r);
		if (s) return n(t, e, s);
	}
	return null;
}
function Ko(t, e, r) {
	let [, n, s, i] = r, a = 4 + n.length, o = t.sourceSpan.start.moveBy(a), u = o.moveBy(i.length), [p, l] = (() => {
		try {
			return [!0, e(i, o).children];
		} catch {
			return [!1, [{
				type: "text",
				value: i,
				sourceSpan: new h(o, u)
			}]];
		}
	})();
	return {
		type: "ieConditionalComment",
		complete: p,
		children: l,
		condition: w(!1, s.trim(), /\s+/gu, " "),
		sourceSpan: t.sourceSpan,
		startSourceSpan: new h(t.sourceSpan.start, o),
		endSourceSpan: new h(u, t.sourceSpan.end)
	};
}
function Xo(t, e, r) {
	let [, n] = r;
	return {
		type: "ieConditionalStartComment",
		condition: w(!1, n.trim(), /\s+/gu, " "),
		sourceSpan: t.sourceSpan
	};
}
function Qo(t) {
	return {
		type: "ieConditionalEndComment",
		sourceSpan: t.sourceSpan
	};
}
var ur = /* @__PURE__ */ new Map([
	["*", /* @__PURE__ */ new Set([
		"accesskey",
		"autocapitalize",
		"autofocus",
		"class",
		"contenteditable",
		"dir",
		"draggable",
		"enterkeyhint",
		"hidden",
		"id",
		"inert",
		"inputmode",
		"is",
		"itemid",
		"itemprop",
		"itemref",
		"itemscope",
		"itemtype",
		"lang",
		"nonce",
		"popover",
		"slot",
		"spellcheck",
		"style",
		"tabindex",
		"title",
		"translate",
		"writingsuggestions"
	])],
	["a", /* @__PURE__ */ new Set([
		"charset",
		"coords",
		"download",
		"href",
		"hreflang",
		"name",
		"ping",
		"referrerpolicy",
		"rel",
		"rev",
		"shape",
		"target",
		"type"
	])],
	["applet", /* @__PURE__ */ new Set([
		"align",
		"alt",
		"archive",
		"code",
		"codebase",
		"height",
		"hspace",
		"name",
		"object",
		"vspace",
		"width"
	])],
	["area", /* @__PURE__ */ new Set([
		"alt",
		"coords",
		"download",
		"href",
		"hreflang",
		"nohref",
		"ping",
		"referrerpolicy",
		"rel",
		"shape",
		"target",
		"type"
	])],
	["audio", /* @__PURE__ */ new Set([
		"autoplay",
		"controls",
		"crossorigin",
		"loop",
		"muted",
		"preload",
		"src"
	])],
	["base", /* @__PURE__ */ new Set(["href", "target"])],
	["basefont", /* @__PURE__ */ new Set([
		"color",
		"face",
		"size"
	])],
	["blockquote", /* @__PURE__ */ new Set(["cite"])],
	["body", /* @__PURE__ */ new Set([
		"alink",
		"background",
		"bgcolor",
		"link",
		"text",
		"vlink"
	])],
	["br", /* @__PURE__ */ new Set(["clear"])],
	["button", /* @__PURE__ */ new Set([
		"disabled",
		"form",
		"formaction",
		"formenctype",
		"formmethod",
		"formnovalidate",
		"formtarget",
		"name",
		"popovertarget",
		"popovertargetaction",
		"type",
		"value"
	])],
	["canvas", /* @__PURE__ */ new Set(["height", "width"])],
	["caption", /* @__PURE__ */ new Set(["align"])],
	["col", /* @__PURE__ */ new Set([
		"align",
		"char",
		"charoff",
		"span",
		"valign",
		"width"
	])],
	["colgroup", /* @__PURE__ */ new Set([
		"align",
		"char",
		"charoff",
		"span",
		"valign",
		"width"
	])],
	["data", /* @__PURE__ */ new Set(["value"])],
	["del", /* @__PURE__ */ new Set(["cite", "datetime"])],
	["details", /* @__PURE__ */ new Set(["name", "open"])],
	["dialog", /* @__PURE__ */ new Set(["open"])],
	["dir", /* @__PURE__ */ new Set(["compact"])],
	["div", /* @__PURE__ */ new Set(["align"])],
	["dl", /* @__PURE__ */ new Set(["compact"])],
	["embed", /* @__PURE__ */ new Set([
		"height",
		"src",
		"type",
		"width"
	])],
	["fieldset", /* @__PURE__ */ new Set([
		"disabled",
		"form",
		"name"
	])],
	["font", /* @__PURE__ */ new Set([
		"color",
		"face",
		"size"
	])],
	["form", /* @__PURE__ */ new Set([
		"accept",
		"accept-charset",
		"action",
		"autocomplete",
		"enctype",
		"method",
		"name",
		"novalidate",
		"target"
	])],
	["frame", /* @__PURE__ */ new Set([
		"frameborder",
		"longdesc",
		"marginheight",
		"marginwidth",
		"name",
		"noresize",
		"scrolling",
		"src"
	])],
	["frameset", /* @__PURE__ */ new Set(["cols", "rows"])],
	["h1", /* @__PURE__ */ new Set(["align"])],
	["h2", /* @__PURE__ */ new Set(["align"])],
	["h3", /* @__PURE__ */ new Set(["align"])],
	["h4", /* @__PURE__ */ new Set(["align"])],
	["h5", /* @__PURE__ */ new Set(["align"])],
	["h6", /* @__PURE__ */ new Set(["align"])],
	["head", /* @__PURE__ */ new Set(["profile"])],
	["hr", /* @__PURE__ */ new Set([
		"align",
		"noshade",
		"size",
		"width"
	])],
	["html", /* @__PURE__ */ new Set(["manifest", "version"])],
	["iframe", /* @__PURE__ */ new Set([
		"align",
		"allow",
		"allowfullscreen",
		"allowpaymentrequest",
		"allowusermedia",
		"frameborder",
		"height",
		"loading",
		"longdesc",
		"marginheight",
		"marginwidth",
		"name",
		"referrerpolicy",
		"sandbox",
		"scrolling",
		"src",
		"srcdoc",
		"width"
	])],
	["img", /* @__PURE__ */ new Set([
		"align",
		"alt",
		"border",
		"crossorigin",
		"decoding",
		"fetchpriority",
		"height",
		"hspace",
		"ismap",
		"loading",
		"longdesc",
		"name",
		"referrerpolicy",
		"sizes",
		"src",
		"srcset",
		"usemap",
		"vspace",
		"width"
	])],
	["input", /* @__PURE__ */ new Set([
		"accept",
		"align",
		"alt",
		"autocomplete",
		"checked",
		"dirname",
		"disabled",
		"form",
		"formaction",
		"formenctype",
		"formmethod",
		"formnovalidate",
		"formtarget",
		"height",
		"ismap",
		"list",
		"max",
		"maxlength",
		"min",
		"minlength",
		"multiple",
		"name",
		"pattern",
		"placeholder",
		"popovertarget",
		"popovertargetaction",
		"readonly",
		"required",
		"size",
		"src",
		"step",
		"type",
		"usemap",
		"value",
		"width"
	])],
	["ins", /* @__PURE__ */ new Set(["cite", "datetime"])],
	["isindex", /* @__PURE__ */ new Set(["prompt"])],
	["label", /* @__PURE__ */ new Set(["for", "form"])],
	["legend", /* @__PURE__ */ new Set(["align"])],
	["li", /* @__PURE__ */ new Set(["type", "value"])],
	["link", /* @__PURE__ */ new Set([
		"as",
		"blocking",
		"charset",
		"color",
		"crossorigin",
		"disabled",
		"fetchpriority",
		"href",
		"hreflang",
		"imagesizes",
		"imagesrcset",
		"integrity",
		"media",
		"referrerpolicy",
		"rel",
		"rev",
		"sizes",
		"target",
		"type"
	])],
	["map", /* @__PURE__ */ new Set(["name"])],
	["menu", /* @__PURE__ */ new Set(["compact"])],
	["meta", /* @__PURE__ */ new Set([
		"charset",
		"content",
		"http-equiv",
		"media",
		"name",
		"scheme"
	])],
	["meter", /* @__PURE__ */ new Set([
		"high",
		"low",
		"max",
		"min",
		"optimum",
		"value"
	])],
	["object", /* @__PURE__ */ new Set([
		"align",
		"archive",
		"border",
		"classid",
		"codebase",
		"codetype",
		"data",
		"declare",
		"form",
		"height",
		"hspace",
		"name",
		"standby",
		"type",
		"typemustmatch",
		"usemap",
		"vspace",
		"width"
	])],
	["ol", /* @__PURE__ */ new Set([
		"compact",
		"reversed",
		"start",
		"type"
	])],
	["optgroup", /* @__PURE__ */ new Set(["disabled", "label"])],
	["option", /* @__PURE__ */ new Set([
		"disabled",
		"label",
		"selected",
		"value"
	])],
	["output", /* @__PURE__ */ new Set([
		"for",
		"form",
		"name"
	])],
	["p", /* @__PURE__ */ new Set(["align"])],
	["param", /* @__PURE__ */ new Set([
		"name",
		"type",
		"value",
		"valuetype"
	])],
	["pre", /* @__PURE__ */ new Set(["width"])],
	["progress", /* @__PURE__ */ new Set(["max", "value"])],
	["q", /* @__PURE__ */ new Set(["cite"])],
	["script", /* @__PURE__ */ new Set([
		"async",
		"blocking",
		"charset",
		"crossorigin",
		"defer",
		"fetchpriority",
		"integrity",
		"language",
		"nomodule",
		"referrerpolicy",
		"src",
		"type"
	])],
	["select", /* @__PURE__ */ new Set([
		"autocomplete",
		"disabled",
		"form",
		"multiple",
		"name",
		"required",
		"size"
	])],
	["slot", /* @__PURE__ */ new Set(["name"])],
	["source", /* @__PURE__ */ new Set([
		"height",
		"media",
		"sizes",
		"src",
		"srcset",
		"type",
		"width"
	])],
	["style", /* @__PURE__ */ new Set([
		"blocking",
		"media",
		"type"
	])],
	["table", /* @__PURE__ */ new Set([
		"align",
		"bgcolor",
		"border",
		"cellpadding",
		"cellspacing",
		"frame",
		"rules",
		"summary",
		"width"
	])],
	["tbody", /* @__PURE__ */ new Set([
		"align",
		"char",
		"charoff",
		"valign"
	])],
	["td", /* @__PURE__ */ new Set([
		"abbr",
		"align",
		"axis",
		"bgcolor",
		"char",
		"charoff",
		"colspan",
		"headers",
		"height",
		"nowrap",
		"rowspan",
		"scope",
		"valign",
		"width"
	])],
	["template", /* @__PURE__ */ new Set([
		"shadowrootclonable",
		"shadowrootdelegatesfocus",
		"shadowrootmode"
	])],
	["textarea", /* @__PURE__ */ new Set([
		"autocomplete",
		"cols",
		"dirname",
		"disabled",
		"form",
		"maxlength",
		"minlength",
		"name",
		"placeholder",
		"readonly",
		"required",
		"rows",
		"wrap"
	])],
	["tfoot", /* @__PURE__ */ new Set([
		"align",
		"char",
		"charoff",
		"valign"
	])],
	["th", /* @__PURE__ */ new Set([
		"abbr",
		"align",
		"axis",
		"bgcolor",
		"char",
		"charoff",
		"colspan",
		"headers",
		"height",
		"nowrap",
		"rowspan",
		"scope",
		"valign",
		"width"
	])],
	["thead", /* @__PURE__ */ new Set([
		"align",
		"char",
		"charoff",
		"valign"
	])],
	["time", /* @__PURE__ */ new Set(["datetime"])],
	["tr", /* @__PURE__ */ new Set([
		"align",
		"bgcolor",
		"char",
		"charoff",
		"valign"
	])],
	["track", /* @__PURE__ */ new Set([
		"default",
		"kind",
		"label",
		"src",
		"srclang"
	])],
	["ul", /* @__PURE__ */ new Set(["compact", "type"])],
	["video", /* @__PURE__ */ new Set([
		"autoplay",
		"controls",
		"crossorigin",
		"height",
		"loop",
		"muted",
		"playsinline",
		"poster",
		"preload",
		"src",
		"width"
	])]
]);
var gi = /* @__PURE__ */ new Set([
	"a",
	"abbr",
	"acronym",
	"address",
	"applet",
	"area",
	"article",
	"aside",
	"audio",
	"b",
	"base",
	"basefont",
	"bdi",
	"bdo",
	"bgsound",
	"big",
	"blink",
	"blockquote",
	"body",
	"br",
	"button",
	"canvas",
	"caption",
	"center",
	"cite",
	"code",
	"col",
	"colgroup",
	"command",
	"content",
	"data",
	"datalist",
	"dd",
	"del",
	"details",
	"dfn",
	"dialog",
	"dir",
	"div",
	"dl",
	"dt",
	"em",
	"embed",
	"fieldset",
	"figcaption",
	"figure",
	"font",
	"footer",
	"form",
	"frame",
	"frameset",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"head",
	"header",
	"hgroup",
	"hr",
	"html",
	"i",
	"iframe",
	"image",
	"img",
	"input",
	"ins",
	"isindex",
	"kbd",
	"keygen",
	"label",
	"legend",
	"li",
	"link",
	"listing",
	"main",
	"map",
	"mark",
	"marquee",
	"math",
	"menu",
	"menuitem",
	"meta",
	"meter",
	"multicol",
	"nav",
	"nextid",
	"nobr",
	"noembed",
	"noframes",
	"noscript",
	"object",
	"ol",
	"optgroup",
	"option",
	"output",
	"p",
	"param",
	"picture",
	"plaintext",
	"pre",
	"progress",
	"q",
	"rb",
	"rbc",
	"rp",
	"rt",
	"rtc",
	"ruby",
	"s",
	"samp",
	"script",
	"search",
	"section",
	"select",
	"shadow",
	"slot",
	"small",
	"source",
	"spacer",
	"span",
	"strike",
	"strong",
	"style",
	"sub",
	"summary",
	"sup",
	"svg",
	"table",
	"tbody",
	"td",
	"template",
	"textarea",
	"tfoot",
	"th",
	"thead",
	"time",
	"title",
	"tr",
	"track",
	"tt",
	"u",
	"ul",
	"var",
	"video",
	"wbr",
	"xmp"
]);
function Jo(t) {
	if (t.type === "block") {
		if (t.name = w(!1, t.name.toLowerCase(), /\s+/gu, " ").trim(), t.type = "angularControlFlowBlock", !me(t.parameters)) {
			delete t.parameters;
			return;
		}
		for (let e of t.parameters) e.type = "angularControlFlowBlockParameter";
		t.parameters = {
			type: "angularControlFlowBlockParameters",
			children: t.parameters,
			sourceSpan: new h(t.parameters[0].sourceSpan.start, K(!1, t.parameters, -1).sourceSpan.end)
		};
	}
}
function Zo(t) {
	t.type === "letDeclaration" && (t.type = "angularLetDeclaration", t.id = t.name, t.init = {
		type: "angularLetDeclarationInitializer",
		sourceSpan: new h(t.valueSpan.start, t.valueSpan.end),
		value: t.value
	}, delete t.name, delete t.value);
}
function eu(t) {
	(t.type === "plural" || t.type === "select") && (t.clause = t.type, t.type = "angularIcuExpression"), t.type === "expansionCase" && (t.type = "angularIcuCase");
}
function Si(t, e, r) {
	let { name: n, canSelfClose: s = !0, normalizeTagName: i = !1, normalizeAttributeName: a = !1, allowHtmComponentClosingTags: o = !1, isTagNameCaseSensitive: u = !1, shouldParseAsRawText: p } = e, { rootNodes: l, errors: m } = Qr(t, {
		canSelfClose: s,
		allowHtmComponentClosingTags: o,
		isTagNameCaseSensitive: u,
		getTagContentType: p ? (...c) => p(...c) ? N.RAW_TEXT : void 0 : void 0,
		tokenizeAngularBlocks: n === "angular" ? !0 : void 0,
		tokenizeAngularLetDeclaration: n === "angular" ? !0 : void 0
	});
	if (n === "vue") {
		if (l.some((x) => x.type === "docType" && x.value === "html" || x.type === "element" && x.name.toLowerCase() === "html")) return Si(t, en, r);
		let g, y = () => g ?? (g = Qr(t, {
			canSelfClose: s,
			allowHtmComponentClosingTags: o,
			isTagNameCaseSensitive: u
		})), q = (x) => y().rootNodes.find(({ startSourceSpan: U }) => U && U.start.offset === x.startSourceSpan.start.offset) ?? x;
		for (let [x, U] of l.entries()) {
			let { endSourceSpan: nn, startSourceSpan: Ei } = U;
			if (nn === null) m = y().errors, l[x] = q(U);
			else if (tu(U, r)) {
				let sn = y().errors.find((an) => an.span.start.offset > Ei.start.offset && an.span.start.offset < nn.end.offset);
				sn && Ci(sn), l[x] = q(U);
			}
		}
	}
	m.length > 0 && Ci(m[0]);
	let f = (c) => {
		let g = c.name.startsWith(":") ? c.name.slice(1).split(":")[0] : null, y = c.nameSpan.toString(), q = g !== null && y.startsWith(`${g}:`);
		c.name = q ? y.slice(g.length + 1) : y, c.namespace = g, c.hasExplicitNamespace = q;
	}, C = (c) => {
		switch (c.type) {
			case "element":
				f(c);
				for (let g of c.attrs) f(g), g.valueSpan ? (g.value = g.valueSpan.toString(), /["']/u.test(g.value[0]) && (g.value = g.value.slice(1, -1))) : g.value = null;
				break;
			case "comment":
				c.value = c.sourceSpan.toString().slice(4, -3);
				break;
			case "text": c.value = c.sourceSpan.toString();
		}
	}, A = (c, g) => {
		let y = c.toLowerCase();
		return g(y) ? y : c;
	}, D = (c) => {
		if (c.type === "element" && (i && (!c.namespace || c.namespace === c.tagDefinition.implicitNamespacePrefix || fe(c)) && (c.name = A(c.name, (g) => gi.has(g))), a)) for (let g of c.attrs) g.namespace || (g.name = A(g.name, (y) => ur.has(c.name) && (ur.get("*").has(y) || ur.get(c.name).has(y))));
	}, I = (c) => {
		c.sourceSpan && c.endSourceSpan && (c.sourceSpan = new h(c.sourceSpan.start, c.endSourceSpan.end));
	}, F = (c) => {
		if (c.type === "element") {
			let g = He(u ? c.name : c.name.toLowerCase());
			!c.namespace || c.namespace === g.implicitNamespacePrefix || fe(c) ? c.tagDefinition = g : c.tagDefinition = He("");
		}
	};
	return Qt(new class extends ft {
		visitExpansionCase(c, g) {
			n === "angular" && this.visitChildren(g, (y) => {
				y(c.expression);
			});
		}
		visit(c) {
			C(c), F(c), D(c), I(c);
		}
	}(), l), l;
}
function tu(t, e) {
	var n;
	if (t.type !== "element" || t.name !== "template") return !1;
	let r = (n = t.attrs.find((s) => s.name === "lang")) == null ? void 0 : n.value;
	return !r || Ne(e, { language: r }) === "html";
}
function Ci(t) {
	let { msg: e, span: { start: r, end: n } } = t;
	throw hi(e, {
		loc: {
			start: {
				line: r.line + 1,
				column: r.col + 1
			},
			end: {
				line: n.line + 1,
				column: n.col + 1
			}
		},
		cause: t
	});
}
function _i(t, e, r = {}, n = !0) {
	let { frontMatter: s, content: i } = n ? mi(t) : {
		frontMatter: null,
		content: t
	}, a = new ve(t, r.filepath), o = new ie(a, 0, 0, 0), p = {
		type: "root",
		sourceSpan: new h(o, o.moveBy(t.length)),
		children: Si(i, e, r)
	};
	if (s) {
		let f = new ie(a, 0, 0, 0);
		s.sourceSpan = new h(f, f.moveBy(s.raw.length)), p.children.unshift(s);
	}
	let l = new or(p), m = (f, C) => {
		let { offset: A } = C, F = _i(w(!1, t.slice(0, A), /[^\n\r]/gu, " ") + f, e, r, !1);
		F.sourceSpan = new h(C, K(!1, F.children, -1).sourceSpan.end);
		let c = F.children[0];
		return c.length === A ? F.children.shift() : (c.sourceSpan = new h(c.sourceSpan.start.moveBy(A), c.sourceSpan.end), c.value = c.value.slice(A)), F;
	};
	return l.walk((f) => {
		if (f.type === "comment") {
			let C = di(f, m);
			C && f.parent.replaceChild(f, C);
		}
		Jo(f), Zo(f), eu(f);
	}), l;
}
function Et(t) {
	return {
		parse: (e, r) => _i(e, t, r),
		hasPragma: ws,
		hasIgnorePragma: bs,
		astFormat: "html",
		locStart: J,
		locEnd: se
	};
}
var en = {
	name: "html",
	normalizeTagName: !0,
	normalizeAttributeName: !0,
	allowHtmComponentClosingTags: !0
};
var ru = Et(en);
var nu = /* @__PURE__ */ new Set(["mj-style", "mj-raw"]);
var su = Et({
	...en,
	name: "mjml",
	shouldParseAsRawText: (t) => nu.has(t)
});
var iu = Et({ name: "angular" });
var au = Et({
	name: "vue",
	isTagNameCaseSensitive: !0,
	shouldParseAsRawText(t, e, r, n) {
		return t.toLowerCase() !== "html" && !r && (t !== "template" || n.some(({ name: s, value: i }) => s === "lang" && i !== "html" && i !== "" && i !== void 0));
	}
});
var ou = Et({
	name: "lwc",
	canSelfClose: !1
});
var uu = { html: qs };
var ym = rn;
//#endregion
export { ym as default, Hs as languages, Us as options, tn as parsers, uu as printers };
