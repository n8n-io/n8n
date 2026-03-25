'use strict';

function Sorter() {
}

Sorter.prototype.sort = function(tokens, fromIndex) {
  fromIndex = fromIndex || 0;
  for (var i = 0, len = this.keys.length; i < len; i++) {
    var key = this.keys[i];
    var token = key.slice(1);
    var index = tokens.indexOf(token, fromIndex);
    if (index !== -1) {
      do {
        if (index !== fromIndex) {
          tokens.splice(index, 1);
          tokens.splice(fromIndex, 0, token);
        }
        fromIndex++;
      } while ((index = tokens.indexOf(token, fromIndex)) !== -1);
      return this[key].sort(tokens, fromIndex);
    }
  }
  return tokens;
};

function TokenChain() {
}

TokenChain.prototype = {
  add: function(tokens) {
    var self = this;
    tokens.forEach(function(token) {
      var key = '$' + token;
      if (!self[key]) {
        self[key] = [];
        self[key].processed = 0;
      }
      self[key].push(tokens);
    });
  },
  createSorter: function() {
    var self = this;
    var sorter = new Sorter();
    sorter.keys = Object.keys(self).sort(function(j, k) {
      var m = self[j].length;
      var n = self[k].length;
      return m < n ? 1 : m > n ? -1 : j < k ? -1 : j > k ? 1 : 0;
    }).filter(function(key) {
      if (self[key].processed < self[key].length) {
        var token = key.slice(1);
        var chain = new TokenChain();
        self[key].forEach(function(tokens) {
          var index;
          while ((index = tokens.indexOf(token)) !== -1) {
            tokens.splice(index, 1);
          }
          tokens.forEach(function(token) {
            self['$' + token].processed++;
          });
          chain.add(tokens.slice(0));
        });
        sorter[key] = chain.createSorter();
        return true;
      }
      return false;
    });
    return sorter;
  }
};

module.exports = TokenChain;
