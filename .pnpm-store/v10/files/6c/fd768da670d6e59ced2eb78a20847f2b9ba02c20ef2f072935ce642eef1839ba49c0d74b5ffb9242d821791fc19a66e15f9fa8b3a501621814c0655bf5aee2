'use strict';

function bufferFromStr(str) {
  return Buffer.from(`${str}\0`);
}

const create_mysql_clear_password_plugin = (pluginOptions) =>
  function mysql_clear_password_plugin({ connection, command }) {
    const password =
      command.password || pluginOptions.password || connection.config.password;

    return function (/* pluginData */) {
      return bufferFromStr(password);
    };
  };

module.exports = create_mysql_clear_password_plugin;
