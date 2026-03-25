module.exports = function realmPlugin() {
  return {
    id: 'realm-plugin',
    processContent: () => {},
    afterRoutesCreated: () => {},
    loaders: { 'test-loader': () => {} },
    requiredEntitlements: ['test-entitlement'],
    ssoConfigSchema: { type: 'object', additionalProperties: true },
    redoclyConfigSchema: { type: 'object', additionalProperties: false },
    ejectIgnore: ['Navbar.tsx', 'Footer.tsx'],
  };
};
