module.exports = {
	// TODO: Find proper solution. Deactivated as it causes problems with quill. Error occurs when clicking in property field which has expression.
	// presets: [
	//   '@vue/app'
	// ]
	// transpileDependencies: [
	//   /\/node_modules\/quill/
	// ]
	plugins: [
		"@babel/plugin-proposal-class-properties",
	],
};
// // https://stackoverflow.com/questions/44625868/es6-babel-class-constructor-cannot-be-invoked-without-new
