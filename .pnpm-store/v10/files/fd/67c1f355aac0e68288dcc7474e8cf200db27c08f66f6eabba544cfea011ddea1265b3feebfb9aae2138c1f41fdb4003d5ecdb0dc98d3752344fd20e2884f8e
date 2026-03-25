/* global requirejs */
requirejs.config({

  baseUrl: '/js-built/lib',
  urlArgs: "bust=" +  (new Date()).getTime(),

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
   * paths are relative to lib
   * define all vendor dependencies here
   */
  paths: {
    'img-files': '../img',
    'test-setup': '../tests/setup',
    'test-files': "../tests/files",
    'templates': "../templates",

    'jquery-ui': "../vendor/jquery-ui/jquery-ui-1.8.24.custom.patched",
    'jquery-ui-i18n': "../vendor/jquery-ui/jquery-ui-i18n.custom",
    "qunit": "../vendor/qunit/qunit-1.10.0",
    'joose': "../vendor/joose/all",
    'ace': "../vendor/ace/lib/ace",
    'psc-tests-assert': '../vendor/qunit-assert/lib/assert',
    'qunit-assert': '../vendor/qunit-assert/lib/assert',
    'TestRunner': "../vendor/qunit-assert/lib/TestRunner",
    'jquery-form': "../vendor/jquery-form/jquery.form-3.20",
    'jquery-fileupload': "../vendor/jquery-fileupload/jquery.fileupload",
    'jquery-iframe-transport': "../vendor/jquery-fileupload/jquery.iframe-transport",
    'jquery-tmpl': "../vendor/jquery-tmpl/jquery.tmpl",
    'jqwidgets': "../vendor/jqwidgets/jqx-all.min",
    'jquery-simulate': "../vendor/jquery-simulate/jquery.simulate.patched",
    'jquery-rangyinputs': "../vendor/jquery-rangyinputs/rangyinputs_jquery.min",
    'jquerypp': "../vendor/jquerypp/1.0.0/amd/jquerypp",
    'ui-connect-morphable': "../vendor/webforge/jquery.ui.connect-morphable",
    'ui-paging': "../vendor/webforge/ui.paging",
    'placeholder': "../vendor/mths.be/placeholder-2.0.6",
    'stacktrace': "../vendor/eriwen/stacktrace-min-0.4",
    'twitter-typeahead': "../vendor/twitter/typeahead/typeahead.min",
    'knockout-mapping': "../vendor/knockout/knockout.mapping",
    'knockout-bindings': "lib/Psc/ko/bindings",
    'jquery-selectrange': "../vendor/stackoverflow/jquery-selectrange",
    'jquery-global': "../vendor/jqwidgets/globalization/jquery.global",
    'jquery-global-de-DE': "../vendor/jqwidgets/globalization/jquery.glob.de-DE",
    'html5shiv': "../vendor/afarkas/html5shiv",
    'i18next': '../vendor/i18next/i18next.amd.withJQuery-1.6.3.min',
    'gdl/master/common/ispy': 'empty-module'
  }
});

define(['jquery'], function ($) {
  $.myPlugin();
});