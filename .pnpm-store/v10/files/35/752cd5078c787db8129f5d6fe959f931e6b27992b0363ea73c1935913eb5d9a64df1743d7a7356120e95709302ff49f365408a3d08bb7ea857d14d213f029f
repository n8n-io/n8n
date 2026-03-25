'use strict';

let policy;
function createPolicy() {
  try {
    policy = window.trustedTypes.createPolicy("iconify", {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      createHTML: (s) => s
    });
  } catch (err) {
    policy = null;
  }
}
function cleanUpInnerHTML(html) {
  if (policy === void 0) {
    createPolicy();
  }
  return policy ? policy.createHTML(html) : html;
}

exports.cleanUpInnerHTML = cleanUpInnerHTML;
