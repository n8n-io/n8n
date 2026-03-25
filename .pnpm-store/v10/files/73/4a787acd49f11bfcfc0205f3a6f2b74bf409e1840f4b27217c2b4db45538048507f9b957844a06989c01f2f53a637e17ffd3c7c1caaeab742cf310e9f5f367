exports.sayHello = function() {
    console.log('Hello from installed module');

    var moduleA;

    try {
        moduleA = require('module-a');
    }
    catch(e) {
        console.log('Not able to find module-a from ' + __filename + '... great!');
    }

    if (moduleA) {
        throw new Error('module-a should not have been found from ' + __filename + '!');
    }
};