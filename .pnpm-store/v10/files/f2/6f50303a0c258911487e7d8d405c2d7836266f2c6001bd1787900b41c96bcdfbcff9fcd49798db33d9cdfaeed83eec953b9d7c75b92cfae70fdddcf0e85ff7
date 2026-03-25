// Not to be used in production!
// Only here to show how much faster bintrees are in the perf benchmarks.
function ArrTree(comparator) {
    this._arr = [];
    this._comparator = comparator;
}

// returns true if inserted, false if duplicate
ArrTree.prototype.insert = function(data) {
  var elem_index = this._find_index(data);
  if(elem_index >= 0) {
    return false;
  }

  // recover the index data should have been inserted at and splice data in
  this._arr.splice(~elem_index, 0, data);
  return true;
};

// returns true if removed, false if not found
ArrTree.prototype.remove = function(data) {
  var elem_index = this._find_index(data);
  if(elem_index < 0) {
    return false;
  }

  // array remains sorted after element has been removed
  this._arr.splice(elem_index, 1);
  return true;
};

ArrTree.prototype.find = function(data) {
  var elem_index = this._find_index(data);
  if(elem_index < 0) {
    return null;
  }

  return this._arr[elem_index];
};

// returns the index if found,
// and the ones-complement of the index it should be inserted at if not
// NOTE: the ones-complement will always be < 0
ArrTree.prototype._find_index = function(data) {
    var min_index = 0;
    var max_index = this._arr.length - 1;
    var current_index;
    var current_element;

    while(min_index <= max_index) {
        current_index = (min_index + max_index) / 2 | 0;
        current_element = this._arr[current_index];

        if (this._comparator(current_element, data) < 0) {
            min_index = current_index + 1;
        }
        else if(this._comparator(current_element, data) > 0) {
            max_index = current_index - 1;
        }
        else {
            return current_index;
        }
    }

    return ~min_index;
}

module.exports = ArrTree;
