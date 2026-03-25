/* global requirejs */
var require = {

  packages: [
    {
      name: "knockout",
      location: "../node_modules/shimney-knockout"
    },
    {
      name: "jquery",
      location: "../node_modules/shimney-jquery"
    },
    {
      name: "sammy",
      location: "../node_modules/shimney-sammy"
    },
    {
      name: "twitter-bootstrap",
      location: "../node_modules/shimney-twitter-bootstrap"
    },
    {
      name: "lodash",
      location: "../node_modules/shimney-lodash"
    },
    {
      name: "hogan",
      location: "../node_modules/shimney-hogan"
    },
    {
      name: "cookie-monster",
      location: "../node_modules/shimney-cookie-monster"
    },
    {
      name: "JSON", // is a direct dependency (in package.json)
      location: "../node_modules/shimney-json"
    }
  ],

  /* set paths and vendor versions for applications
   *
   * paths are relative to src
   * define all vendor dependencies here
   */
  paths: {
    'img-files': '../img',
    'tpl': '../templates',

    'some-plugin': "../vendor/some-plugin.1.0"
  }
};

if (typeof(requirejs) === "function") {
  requirejs.config(require);
}