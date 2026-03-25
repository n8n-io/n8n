// By default, we want to infer the IP address, unless this is explicitly set to `null`
// We do this after all other processing is done
// If `ip_address` is explicitly set to `null` or a value, we leave it as is

/**
 * @internal
 * @deprecated -- set ip inferral via via SDK metadata options on client instead.
 */
function addAutoIpAddressToUser(objWithMaybeUser) {
  if (objWithMaybeUser.user?.ip_address === undefined) {
    objWithMaybeUser.user = {
      ...objWithMaybeUser.user,
      ip_address: '{{auto}}',
    };
  }
}

/**
 * @internal
 */
function addAutoIpAddressToSession(session) {
  if ('aggregates' in session) {
    if (session.attrs?.['ip_address'] === undefined) {
      session.attrs = {
        ...session.attrs,
        ip_address: '{{auto}}',
      };
    }
  } else {
    if (session.ipAddress === undefined) {
      session.ipAddress = '{{auto}}';
    }
  }
}

export { addAutoIpAddressToSession, addAutoIpAddressToUser };
//# sourceMappingURL=ipAddress.js.map
