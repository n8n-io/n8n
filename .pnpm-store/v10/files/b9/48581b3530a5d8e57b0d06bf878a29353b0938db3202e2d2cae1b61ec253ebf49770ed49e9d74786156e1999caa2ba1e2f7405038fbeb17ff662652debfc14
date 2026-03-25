/**
Gather a list of all Scopes starting recursively from the input Scope.

@param {Scope} scope - The Scope to start checking from.
@returns {Scope[]} - The resulting Scopes.
*/
const getScopes = scope => [
	scope,
	...scope.childScopes.flatMap(scope => getScopes(scope)),
];

export default getScopes;
