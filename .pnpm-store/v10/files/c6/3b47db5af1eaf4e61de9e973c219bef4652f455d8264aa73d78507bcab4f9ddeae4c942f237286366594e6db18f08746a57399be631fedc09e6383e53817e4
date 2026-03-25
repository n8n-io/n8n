"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = setOrganizer;

function setOrganizer(_ref) {
  var name = _ref.name,
      email = _ref.email,
      dir = _ref.dir;
  var formattedOrganizer = '';
  formattedOrganizer += dir ? "DIR=\"".concat(dir, "\";") : '';
  formattedOrganizer += 'CN=';
  formattedOrganizer += name || 'Organizer';
  formattedOrganizer += email ? ":mailto:".concat(email) : '';
  return formattedOrganizer;
}