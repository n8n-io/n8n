// This file imports and re-exports the credentials and nodes
// This pattern is used by n8n to load the credentials and nodes

module.exports = {
    // Empty on purpose.
    // The n8n package loader will scan the package.json n8n section for
    // nodes and credentials. This file is only needed to make sure the
    // package is properly loadable by Node.js/npm.
};
