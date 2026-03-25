'use strict';

const CLIENT_CLOSED_REQUEST_CODE = 499;

module.exports = function(res) {
  if (res.headersSent) {
    return res.status_code || res.statusCode;
  } else {
    return CLIENT_CLOSED_REQUEST_CODE;
  }
};
