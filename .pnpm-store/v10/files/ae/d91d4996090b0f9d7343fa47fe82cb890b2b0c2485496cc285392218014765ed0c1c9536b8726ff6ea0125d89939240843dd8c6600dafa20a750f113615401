'use strict';

/*global module:false*/
module.exports = function(grunt) {

  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  grunt.initConfig({

    jshint: {
      options: {
        jshintrc: '.jshintrc',
      },
      libs: {
        src: ['Gruntfile.js', 'index.js', 'test/**/*.js', '!files/fixtures/parse-error-config.js']
      }
    },

    simplemocha: {
      options: {
        timeout: 3000,
        ui: 'bdd',
        reporter: 'spec'
      },

      all: { src: ['test/**/*.js'] }
    }

  });

  grunt.registerTask('default', ['jshint']);
  grunt.registerTask('test', ['jshint', 'simplemocha:all']);
};