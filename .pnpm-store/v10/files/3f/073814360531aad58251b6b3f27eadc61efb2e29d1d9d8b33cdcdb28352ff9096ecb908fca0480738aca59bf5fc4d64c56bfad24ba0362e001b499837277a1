const npm = {
    stat: require('./static')
};

module.exports = function ($p) {

    const exp = {
        formatError: npm.stat.formatError,
        isPromise: npm.stat.isPromise,
        isReadableStream: npm.stat.isReadableStream,
        messageGap: npm.stat.messageGap,
        extend: npm.stat.extend,
        resolve: resolve,
        wrap: wrap
    };

    return exp;

    //////////////////////////////////////////
    // Checks if the function is a generator,
    // and if so - wraps it up into a promise;
    function wrap(func) {
        if (typeof func === 'function') {
            if (func.constructor.name === 'GeneratorFunction') {
                return asyncAdapter(func);
            }
            return func;
        }
        return null;
    }

    /////////////////////////////////////////////////////
    // Resolves a mixed value into the actual value,
    // consistent with the way mixed values are defined:
    // https://github.com/vitaly-t/spex/wiki/Mixed-Values
    function resolve(value, params, onSuccess, onError) {

        const self = this;
        let delayed = false;

        function loop() {
            while (typeof value === 'function') {
                if (value.constructor.name === 'GeneratorFunction') {
                    value = asyncAdapter(value);
                }
                try {
                    value = params ? value.apply(self, params) : value.call(self);
                } catch (e) {
                    onError(e, false); // false means 'threw an error'
                    return;
                }
            }
            if (exp.isPromise(value)) {
                value
                    .then(data => {
                        delayed = true;
                        value = data;
                        loop();
                        return null; // this dummy return is just to prevent Bluebird warnings;
                    })
                    .catch(error => {
                        onError(error, true); // true means 'rejected'
                    });
            } else {
                onSuccess(value, delayed);
            }
        }

        loop();
    }

    // Generator-to-Promise adapter;
    // Based on: https://www.promisejs.org/generators/#both
    function asyncAdapter(generator) {
        return function () {
            const g = generator.apply(this, arguments);

            function handle(result) {
                if (result.done) {
                    return $p.resolve(result.value);
                }
                return $p.resolve(result.value)
                    .then(res => handle(g.next(res)), err => handle(g.throw(err)));
            }

            return handle(g.next());
        };
    }

};
