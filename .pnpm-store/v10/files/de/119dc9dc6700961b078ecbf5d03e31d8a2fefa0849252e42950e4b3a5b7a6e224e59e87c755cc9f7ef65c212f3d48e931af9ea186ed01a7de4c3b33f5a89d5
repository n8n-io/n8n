class PromiseQueue {
    constructor({ concurrency = 1 } = {}) {
        this.options = { concurrency };
        this.running = 0;
        this.queue = [];
        this.idleCallbacks = [];
    }
    clear() {
        this.queue = [];
    }
    onIdle(callback) {
        this.idleCallbacks.push(callback);
        return () => {
            const index = this.idleCallbacks.indexOf(callback);
            if (index !== -1) {
                this.idleCallbacks.splice(index, 1);
            }
        };
    }
    waitTillIdle() {
        return new Promise(resolve => {
            if (this.running === 0) {
                resolve();
                return;
            }
            const dispose = this.onIdle(() => {
                dispose();
                resolve();
            });
        });
    }
    add(callback) {
        return new Promise((resolve, reject) => {
            const runCallback = () => {
                this.running += 1;
                try {
                    Promise.resolve(callback()).then(val => {
                        resolve(val);
                        this.processNext();
                    }, err => {
                        reject(err);
                        this.processNext();
                    });
                }
                catch (err) {
                    reject(err);
                    this.processNext();
                }
            };
            if (this.running >= this.options.concurrency) {
                this.queue.push(runCallback);
            }
            else {
                runCallback();
            }
        });
    }
    // Internal function, don't use
    processNext() {
        this.running -= 1;
        const callback = this.queue.shift();
        if (callback) {
            callback();
        }
        else if (this.running === 0) {
            this.idleCallbacks.forEach(item => item());
        }
    }
}
export { PromiseQueue };
