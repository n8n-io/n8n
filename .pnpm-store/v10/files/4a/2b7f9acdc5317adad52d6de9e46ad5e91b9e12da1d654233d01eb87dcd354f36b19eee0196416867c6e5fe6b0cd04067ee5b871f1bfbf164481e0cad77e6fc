'use strict';

const path = require('path');
const {promisify} = require('util');
const gv = require('ts-graphviz');
const adapter = require('ts-graphviz/adapter');
const toArray = require('stream-to-array');
const exec = promisify(require('child_process').execFile);
const writeFile = promisify(require('fs').writeFile);

/**
 * Set color on a node.
 * @param  {Object} node
 * @param  {String} color
 */
function setNodeColor(node, color) {
	node.attributes.set('color', color);
	node.attributes.set('fontcolor', color);
}

/**
 * Check if Graphviz is installed on the system.
 * @param  {Object} config
 * @return {Promise}
 */
async function checkGraphvizInstalled(config) {
	const cmd = config.graphVizPath ? path.join(config.graphVizPath, 'gvpr') : 'gvpr';

	try {
		await exec(cmd, ['-V']);
	} catch (err) {
		if (err.code === 'ENOENT') {
			throw new Error(`Graphviz could not be found. Ensure that "gvpr" is in your $PATH. ${err}`);
		} else {
			throw new Error(`Unexpected error when calling Graphviz "${cmd}". ${err}`);
		}
	}
}

/**
 * Return options to use with graphviz digraph.
 * @param  {Object} config
 * @return {Object}
 */
function createGraphvizOptions(config) {
	const graphVizOptions = config.graphVizOptions || {};

	return {
		dotCommand: config.graphVizPath ? config.graphVizPath : null,
		attributes: {
			// Graph
			graph: Object.assign({
				overlap: false,
				pad: 0.3,
				rankdir: config.rankdir,
				layout: config.layout,
				bgcolor: config.backgroundColor
			}, graphVizOptions.G),
			// Edge
			edge: Object.assign({
				color: config.edgeColor
			}, graphVizOptions.E),
			// Node
			node: Object.assign({
				fontname: config.fontName,
				fontsize: config.fontSize,
				color: config.nodeColor,
				shape: config.nodeShape,
				style: config.nodeStyle,
				height: 0,
				fontcolor: config.nodeColor
			}, graphVizOptions.N)
		}
	};
}

/**
 * Creates the graphviz graph.
 * @param  {Object} modules
 * @param  {Array} circular
 * @param  {Object} config
 * @param  {Object} options
 * @return {Promise}
 */
function createGraph(modules, circular, config, options) {
	const g = gv.digraph('G');
	const nodes = {};
	const cyclicModules = circular.reduce((a, b) => a.concat(b), []);

	Object.keys(modules).forEach((id) => {
		nodes[id] = nodes[id] || g.createNode(id);

		if (!modules[id].length) {
			setNodeColor(nodes[id], config.noDependencyColor);
		} else if (cyclicModules.indexOf(id) >= 0) {
			setNodeColor(nodes[id], config.cyclicNodeColor);
		}

		modules[id].forEach((depId) => {
			nodes[depId] = nodes[depId] || g.createNode(depId);

			if (!modules[depId]) {
				setNodeColor(nodes[depId], config.noDependencyColor);
			}

			g.createEdge([nodes[id], nodes[depId]]);
		});
	});
	const dot = gv.toDot(g);
	return adapter
		.toStream(dot, options)
		.then(toArray)
		.then(Buffer.concat);
}

/**
 * Return the module dependency graph XML SVG representation as a Buffer.
 * @param  {Object} modules
 * @param  {Array} circular
 * @param  {Object} config
 * @return {Promise}
 */
module.exports.svg = function (modules, circular, config) {
	const options = createGraphvizOptions(config);

	options.format = 'svg';

	return checkGraphvizInstalled(config)
		.then(() => createGraph(modules, circular, config, options));
};

/**
 * Creates an image from the module dependency graph.
 * @param  {Object} modules
 * @param  {Array} circular
 * @param  {String} imagePath
 * @param  {Object} config
 * @return {Promise}
 */
module.exports.image = function (modules, circular, imagePath, config) {
	const options = createGraphvizOptions(config);

	options.format = path.extname(imagePath).replace('.', '') || 'png';

	return checkGraphvizInstalled(config)
		.then(() => {
			return createGraph(modules, circular, config, options)
				.then((image) => writeFile(imagePath, image))
				.then(() => path.resolve(imagePath));
		});
};

/**
 * Return the module dependency graph as DOT output.
 * @param  {Object} modules
 * @param  {Array} circular
 * @param  {Object} config
 * @return {Promise}
 */
module.exports.dot = function (modules, circular, config) {
	const options = createGraphvizOptions(config);

	options.format = 'dot';

	return checkGraphvizInstalled(config)
		.then(() => createGraph(modules, circular, config, options))
		.then((output) => output.toString('utf8'));
};
