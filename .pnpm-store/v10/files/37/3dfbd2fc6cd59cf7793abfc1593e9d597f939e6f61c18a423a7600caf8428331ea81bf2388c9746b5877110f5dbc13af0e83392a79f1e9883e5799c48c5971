var assert = require('assert'),
    path = require('path'),
    spawn = require('child_process').spawnSync;

describe('bin/license-checker', function() {
    this.timeout(8000);

    it('should restrict the output to the provided packages', function() {
        var restrictedPackages = [
            'readable-stream@1.1.14',
            //'spdx-satisfies@4.0.0',
            'y18n@3.2.1',
        ];
        var output = spawn('node', [path.join(__dirname, '../bin/license-checker'), '--json', '--packages', restrictedPackages.join(';')], {
            cwd: path.join(__dirname, '../'),
        });

        assert.deepEqual(Object.keys(JSON.parse(output.stdout.toString())), restrictedPackages);
    });

    it('should exclude provided excludedPackages from the output', function() {
        var excludedPackages = [
            'readable-stream@1.1.14',
            'spdx-satisfies@4.0.0',
            'y18n@3.2.1',
        ];
        var output = spawn('node', [path.join(__dirname, '../bin/license-checker'), '--json', '--excludePackages', excludedPackages.join(';')], {
            cwd: path.join(__dirname, '../'),
        });
        
        var packages = Object.keys(JSON.parse(output.stdout.toString()));
        excludedPackages.forEach(function(pkg) {
            assert.ok(!packages.includes(pkg));
        });
    });

    it('should exclude private packages from the output', function() {
        var output = spawn('node', [path.join(__dirname, '../bin/license-checker'), '--json', '--excludePrivatePackages'], {
            cwd: path.join(__dirname, 'fixtures', 'privateModule'),
        });

        var packages = Object.keys(JSON.parse(output.stdout.toString()));
        assert.equal(packages.length, 0);
    });
});
