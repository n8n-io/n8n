'use strict';

//const PLUGIN_NAME = 'mysql_native_password';
const auth41 = require('../auth_41.js');

module.exports =
  (pluginOptions) =>
  ({ connection, command }) => {
    const password =
      command.password || pluginOptions.password || connection.config.password;
    const passwordSha1 =
      command.passwordSha1 ||
      pluginOptions.passwordSha1 ||
      connection.config.passwordSha1;
    return (data) => {
      const authPluginData1 = data.slice(0, 8);
      const authPluginData2 = data.slice(8, 20);
      let authToken;
      if (passwordSha1) {
        authToken = auth41.calculateTokenFromPasswordSha(
          passwordSha1,
          authPluginData1,
          authPluginData2
        );
      } else {
        authToken = auth41.calculateToken(
          password,
          authPluginData1,
          authPluginData2
        );
      }
      return authToken;
    };
  };
