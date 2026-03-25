// generates a test case to STDOUT

var no_dups = false; // set to true if you don't want duplicate inserts
var num_inserts = 100000;

function randInt(start, end) {
    return Math.floor(Math.random()*(end-start + 1)) + start;
}

function get_node_to_remove() {
    var idx = randInt(0, added.length - 1);
    return added.splice(idx, 1)[0];
}


var nums = [];
var added = [];
var ahash = {};
for(var i=0; i < num_inserts; i++) {
    do {
        var n = randInt(1, 1000000000);
    } while(no_dups && ahash[n]);
    added.push(n);
    nums.push(n);
    if(no_dups)
        ahash[n] = true;

    if(Math.random() < .3) {
        // remove a node
        nums.push(-get_node_to_remove());
    }
}

// remove the rest, randomly
while(added.length > 0)
    nums.push(-get_node_to_remove());

console.log(nums.join('\n'));
