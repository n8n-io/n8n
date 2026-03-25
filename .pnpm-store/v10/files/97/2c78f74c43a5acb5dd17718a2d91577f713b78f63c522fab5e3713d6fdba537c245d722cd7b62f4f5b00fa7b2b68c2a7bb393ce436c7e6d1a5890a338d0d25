var expect = require("chai").expect;
var fs = require("fs");
var split_ca = require("../index.js");

describe('split', function(){
  var emptyFile = "test/certs/empty.ca";
  var missingFile = "test/certs/missing.ca";
  var unreadableFile = "test/certs/unreadable.ca";
  var garbageFile = "test/certs/garbage.ca";
  var ca0file = "test/certs/split0.ca";
  var ca1file = "test/certs/split1.ca";
  var caBundleFile = "test/certs/test-chain.bundle";
  var ca0 = fs.readFileSync(ca0file,"utf8").toString().replace(/\n$/, '');
  var ca1 = fs.readFileSync(ca1file,"utf8").toString().replace(/\n$/, '');
  describe('multiple ca chain', function(){
    it('should return an array of CA chain strings', function(){
      var split = split_ca(caBundleFile);
      expect(split).to.be.an("array");
      expect(split).to.have.members([ca0, ca1]);
    });
  });
  describe('single ca chain', function(){
    it('should return an array of one CA string', function(){
      var split = split_ca(ca1file);
      expect(split).to.be.an("array");
      expect(split).to.have.members([ca1]);
      expect(split).to.not.have.members([ca0]);
    });
  });
  describe('empty file', function(){
    it('should throw a bad file error', function(){
      expect(function(){split_ca(emptyFile)}).to.throw(Error);
    });
  });
  describe('directory instead of file', function(){
    it('should throw a bad file error', function(){
      expect(function(){split_ca(unreadableFile)}).to.throw(Error);
    });
  });
  describe('garbage file', function(){
    it('should throw a bad file error', function(){
      expect(function(){ split_ca(garbageFile)}).to.throw(Error);
    });
  });
});
