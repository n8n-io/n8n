module.exports = function (grunt) {
    grunt.initConfig({
        jshint: {
            options: {},
            default: {
                files: {
                    src: ['gruntfile.js', 'src/**/*.js', '!src/libs/jsbn.js']
                }
            },
            libs: {
                files: {
                    src: ['src/libs/**/*']
                }
            }
        },

        simplemocha: {
            options: {
                reporter: 'list'
            },
            all: {src: ['test/**/*.js']}
        }
    });

    require('jit-grunt')(grunt, {
        'simplemocha': 'grunt-simple-mocha'
    });

    grunt.registerTask('lint', ['jshint:default']);
    grunt.registerTask('test', ['simplemocha']);

    grunt.registerTask('default', ['lint', 'test']);
};