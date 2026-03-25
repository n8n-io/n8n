import { toBase64Url } from "./utils.js";
//#region src/runnables/graph_mermaid.ts
function _escapeNodeLabel(nodeLabel) {
	return nodeLabel.replace(/[^a-zA-Z-_0-9]/g, "_");
}
const MARKDOWN_SPECIAL_CHARS = [
	"*",
	"_",
	"`"
];
function _generateMermaidGraphStyles(nodeColors) {
	let styles = "";
	for (const [className, color] of Object.entries(nodeColors)) styles += `\tclassDef ${className} ${color};\n`;
	return styles;
}
/**
* Draws a Mermaid graph using the provided graph data
*/
function drawMermaid(nodes, edges, config) {
	const { firstNode, lastNode, nodeColors, withStyles = true, curveStyle = "linear", wrapLabelNWords = 9 } = config ?? {};
	let mermaidGraph = withStyles ? `%%{init: {'flowchart': {'curve': '${curveStyle}'}}}%%\ngraph TD;\n` : "graph TD;\n";
	if (withStyles) {
		const defaultClassLabel = "default";
		const formatDict = { [defaultClassLabel]: "{0}({1})" };
		if (firstNode !== void 0) formatDict[firstNode] = "{0}([{1}]):::first";
		if (lastNode !== void 0) formatDict[lastNode] = "{0}([{1}]):::last";
		for (const [key, node] of Object.entries(nodes)) {
			const nodeName = node.name.split(":").pop() ?? "";
			let finalLabel = MARKDOWN_SPECIAL_CHARS.some((char) => nodeName.startsWith(char) && nodeName.endsWith(char)) ? `<p>${nodeName}</p>` : nodeName;
			if (Object.keys(node.metadata ?? {}).length) finalLabel += `<hr/><small><em>${Object.entries(node.metadata ?? {}).map(([k, v]) => `${k} = ${v}`).join("\n")}</em></small>`;
			const nodeLabel = (formatDict[key] ?? formatDict[defaultClassLabel]).replace("{0}", _escapeNodeLabel(key)).replace("{1}", finalLabel);
			mermaidGraph += `\t${nodeLabel}\n`;
		}
	}
	const edgeGroups = {};
	for (const edge of edges) {
		const srcParts = edge.source.split(":");
		const tgtParts = edge.target.split(":");
		const commonPrefix = srcParts.filter((src, i) => src === tgtParts[i]).join(":");
		if (!edgeGroups[commonPrefix]) edgeGroups[commonPrefix] = [];
		edgeGroups[commonPrefix].push(edge);
	}
	const seenSubgraphs = /* @__PURE__ */ new Set();
	function sortPrefixesByDepth(prefixes) {
		return [...prefixes].sort((a, b) => {
			return a.split(":").length - b.split(":").length;
		});
	}
	function addSubgraph(edges, prefix) {
		const selfLoop = edges.length === 1 && edges[0].source === edges[0].target;
		if (prefix && !selfLoop) {
			const subgraph = prefix.split(":").pop();
			if (seenSubgraphs.has(prefix)) throw new Error(`Found duplicate subgraph '${subgraph}' at '${prefix} -- this likely means that you're reusing a subgraph node with the same name. Please adjust your graph to have subgraph nodes with unique names.`);
			seenSubgraphs.add(prefix);
			mermaidGraph += `\tsubgraph ${subgraph}\n`;
		}
		const nestedPrefixes = sortPrefixesByDepth(Object.keys(edgeGroups).filter((nestedPrefix) => nestedPrefix.startsWith(`${prefix}:`) && nestedPrefix !== prefix && nestedPrefix.split(":").length === prefix.split(":").length + 1));
		for (const nestedPrefix of nestedPrefixes) addSubgraph(edgeGroups[nestedPrefix], nestedPrefix);
		for (const edge of edges) {
			const { source, target, data, conditional } = edge;
			let edgeLabel = "";
			if (data !== void 0) {
				let edgeData = data;
				const words = edgeData.split(" ");
				if (words.length > wrapLabelNWords) edgeData = Array.from({ length: Math.ceil(words.length / wrapLabelNWords) }, (_, i) => words.slice(i * wrapLabelNWords, (i + 1) * wrapLabelNWords).join(" ")).join("&nbsp;<br>&nbsp;");
				edgeLabel = conditional ? ` -. &nbsp;${edgeData}&nbsp; .-> ` : ` -- &nbsp;${edgeData}&nbsp; --> `;
			} else edgeLabel = conditional ? " -.-> " : " --> ";
			mermaidGraph += `\t${_escapeNodeLabel(source)}${edgeLabel}${_escapeNodeLabel(target)};\n`;
		}
		if (prefix && !selfLoop) mermaidGraph += "	end\n";
	}
	addSubgraph(edgeGroups[""] ?? [], "");
	for (const prefix in edgeGroups) if (!prefix.includes(":") && prefix !== "") addSubgraph(edgeGroups[prefix], prefix);
	if (withStyles) mermaidGraph += _generateMermaidGraphStyles(nodeColors ?? {});
	return mermaidGraph;
}
/**
* Renders Mermaid graph using the Mermaid.INK API.
*
* @example
* ```javascript
* const image = await drawMermaidImage(mermaidSyntax, {
*   backgroundColor: "white",
*   imageType: "png",
* });
* fs.writeFileSync("image.png", image);
* ```
*
* @param mermaidSyntax - The Mermaid syntax to render.
* @param config - The configuration for the image.
* @returns The image as a Blob.
*/
async function drawMermaidImage(mermaidSyntax, config) {
	let backgroundColor = config?.backgroundColor ?? "white";
	const imageType = config?.imageType ?? "png";
	const mermaidSyntaxEncoded = toBase64Url(mermaidSyntax);
	if (backgroundColor !== void 0) {
		if (!/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(backgroundColor)) backgroundColor = `!${backgroundColor}`;
	}
	const imageUrl = `https://mermaid.ink/img/${mermaidSyntaxEncoded}?bgColor=${backgroundColor}&type=${imageType}`;
	const res = await fetch(imageUrl);
	if (!res.ok) throw new Error([
		`Failed to render the graph using the Mermaid.INK API.`,
		`Status code: ${res.status}`,
		`Status text: ${res.statusText}`
	].join("\n"));
	return await res.blob();
}
//#endregion
export { drawMermaid, drawMermaidImage };

//# sourceMappingURL=graph_mermaid.js.map