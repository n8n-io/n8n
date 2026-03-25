import getScopes from './get-scopes.js';

const getReferences = scope => [...new Set(getScopes(scope).flatMap(({references}) => references))];

export default getReferences;
