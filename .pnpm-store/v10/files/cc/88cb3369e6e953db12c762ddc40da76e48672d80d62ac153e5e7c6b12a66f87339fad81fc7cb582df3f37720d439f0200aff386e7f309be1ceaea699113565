'use strict';

const webpack = require('webpack');

const nodeProtocolRegex = /^node:/;

function NodeProtocolUrlPlugin() {
	return new webpack.NormalModuleReplacementPlugin(
		nodeProtocolRegex,
		(resource) => {
			resource.request = resource.request.replace(nodeProtocolRegex, '');
		}
	);
}

module.exports.NodeProtocolUrlPlugin = NodeProtocolUrlPlugin;
