'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var insertHeadCSS = exports.insertHeadCSS = function insertHeadCSS($, headCSS) {
  if (!headCSS || headCSS.length == 0) {
    return $;
  }

  $('head').append('<style type="text/css">' + headCSS.join('') + '</style>');

  return $;
};

var fixLegacyAttrs = exports.fixLegacyAttrs = function fixLegacyAttrs($) {
  var legacyAttrs = ['align', 'valign', 'bgcolor', 'border', 'background'];

  // https://github.com/facebook/react/issues/140 ...
  // server side workaround to allow custom tags.
  legacyAttrs.forEach(function (attr) {
    var dataAttr = 'data-legacy-' + attr;

    $('[' + dataAttr + ']').each(function () {
      $(this).attr(attr, $(this).attr(dataAttr));
      $(this).removeAttr(dataAttr);
    });
  });

  $('*[class=""]').removeAttr('class');

  return $;
};