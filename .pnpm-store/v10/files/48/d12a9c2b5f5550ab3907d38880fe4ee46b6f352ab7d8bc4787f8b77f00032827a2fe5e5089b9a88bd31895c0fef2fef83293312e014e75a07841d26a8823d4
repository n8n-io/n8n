var path = require('path'),
    fs = require('fs');

var templates = {
  'encrypted-key': require('./templates/encrypted-key.tpl.xml'),
  'keyinfo': require('./templates/keyinfo.tpl.xml'),
};

function renderTemplate(file, data) {
  return templates[file](data);
}

function pemToCert(pem) {
  var cert = /-----BEGIN CERTIFICATE-----([^-]*)-----END CERTIFICATE-----/g.exec(pem);
  if (cert.length > 0) {
    return cert[1].replace(/[\n|\r\n]/g, '');
  }

  return null;
};

function warnInsecureAlgorithm(algorithm, enabled = true) {
  if (enabled) {
    console.warn(algorithm + " is no longer recommended due to security reasons. Please deprecate its use as soon as possible.")
  }
}

module.exports = {
  renderTemplate: renderTemplate,
  pemToCert: pemToCert,
  warnInsecureAlgorithm: warnInsecureAlgorithm
};
