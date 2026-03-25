let globalPnpApi;
try {
    globalPnpApi = require(`pnpapi`);
} catch {
    // Just ignore if we don't have a global PnP instance - perhaps
    // we'll eventually find one at runtime due to multi-tree
}

const createRequire = require(`./createRequire`);
const getDefaultResolver = require(`./getDefaultResolver`);

module.exports = (request, options) => {
  const {
    basedir,
    defaultResolver = getDefaultResolver(),
    extensions,
  } = options;

  if (process.versions.pnp) {
    let pnpApi = globalPnpApi;

    // While technically it would be more correct to run this code
    // everytime (since they file being run *may* belong to a
    // different dependency tree than the one owning Jest), in
    // practice this doesn't happen anywhere else than on the Jest
    // repository itself (in the test env). So in order to preserve
    // the performances, we can afford a slight incoherence here.
    if (!pnpApi) {
      try {
        const baseReq = createRequire(`${basedir}/internal.js`);
        pnpApi = baseReq(`pnpapi`);
      } catch {
        // The file isn't part of a PnP dependency tree, so we can
        // just use the default Jest resolver.
      }
    }

    if (pnpApi) {
      const resolution = pnpApi.resolveRequest(request, `${basedir}/`, {extensions});

      // When the request is a native module, Jest expects to get the string back unmodified, but pnp returns null instead.
      if (resolution === null)
        return request;

      return resolution;
    }
  }

  return defaultResolver(request, {...options, allowPnp: false});
};
