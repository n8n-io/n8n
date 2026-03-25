const _Terminal = require('./terminal');
const _BarElement = require('./generic-bar');
const _options = require('./options');
const _EventEmitter = require('events');

// Progress-Bar constructor
module.exports = class MultiBar extends _EventEmitter{

    constructor(options, preset){
        super();

        // list of bars
        this.bars = [];

        // parse+store options
        this.options = _options.parse(options, preset);

        // disable synchronous updates
        this.options.synchronousUpdate = false;

        // store terminal instance
        this.terminal = (this.options.terminal) ? this.options.terminal : new _Terminal(this.options.stream);

        // the update timer
        this.timer = null;

        // progress bar active ?
        this.isActive = false;

        // update interval
        this.schedulingRate = (this.terminal.isTTY() ? this.options.throttleTime : this.options.notTTYSchedule);

        // logging output buffer
        this.loggingBuffer = [];

        // callback used for gracefulExit
        this.sigintCallback = null;
    }

    // add a new bar to the stack
    create(total, startValue, payload, barOptions={}){
        // create new bar element and merge global options + overrides
        // use the same global terminal instance for all instances
        const bar = new _BarElement(Object.assign(
            {}, 

            // global options
            this.options, 

            // terminal instance
            {
                terminal: this.terminal
            },

            // overrides
            barOptions,
        ));

        // store bar
        this.bars.push(bar);

        // progress updates are only visible in TTY mode!
        if (this.options.noTTYOutput === false && this.terminal.isTTY() === false){
            return bar;
        }

        // add handler to restore cursor settings (stop the bar) on SIGINT/SIGTERM ?
        if (this.sigintCallback === null && this.options.gracefulExit){
            this.sigintCallback = this.stop.bind(this);
            process.once('SIGINT', this.sigintCallback);
            process.once('SIGTERM', this.sigintCallback);
        }
        
        // multiprogress already active ?
        if (!this.isActive){
            // hide the cursor ?
            if (this.options.hideCursor === true){
                this.terminal.cursor(false);
            }

            // disable line wrapping ?
            if (this.options.linewrap === false){
                this.terminal.lineWrapping(false);
            }
    
            // initialize update timer
            this.timer = setTimeout(this.update.bind(this), this.schedulingRate);
        }

        // set flag
        this.isActive = true;

        // start progress bar
        bar.start(total, startValue, payload);

        // trigger event
        this.emit('start');

        // return new instance
        return bar;
    }

    // remove a bar from the stack
    remove(bar){
        // find element
        const index = this.bars.indexOf(bar);

        // element found ?
        if (index < 0){
            return false;
        }

        // remove element
        this.bars.splice(index, 1);

        // force update
        this.update();

        // clear bottom
        this.terminal.newline();
        this.terminal.clearBottom();

        return true;
    }

    // internal update routine
    update(){
        // stop timer
        if (this.timer){
            clearTimeout(this.timer);
            this.timer = null;
        }

        // trigger event
        this.emit('update-pre');
        
        // reset cursor
        this.terminal.cursorRelativeReset();

        // trigger event
        this.emit('redraw-pre');

        // content within logging buffer ?
        if (this.loggingBuffer.length > 0){
            this.terminal.clearLine();

            // flush logging buffer and write content to terminal
            while (this.loggingBuffer.length > 0){
                this.terminal.write(this.loggingBuffer.shift(), true);
            }
        }

        // update each bar
        for (let i=0; i< this.bars.length; i++){
            // add new line ?
            if (i > 0){
                this.terminal.newline();
            }

            // render
            this.bars[i].render();
        }

        // trigger event
        this.emit('redraw-post');

        // add new line in notty mode!
        if (this.options.noTTYOutput && this.terminal.isTTY() === false){
            this.terminal.newline();
            this.terminal.newline();
        }

        // next update
        this.timer = setTimeout(this.update.bind(this), this.schedulingRate);

        // trigger event
        this.emit('update-post');

        // stop if stopOnComplete and all bars stopped
        if (this.options.stopOnComplete && !this.bars.find(bar => bar.isActive)) {
            this.stop();
        }
    }

    stop(){

        // stop timer
        clearTimeout(this.timer);
        this.timer = null;

        // remove sigint listener
        if (this.sigintCallback){
            process.removeListener('SIGINT', this.sigintCallback);
            process.removeListener('SIGTERM', this.sigintCallback);
            this.sigintCallback = null;
        }

        // set flag
        this.isActive = false;

        // cursor hidden ?
        if (this.options.hideCursor === true){
            this.terminal.cursor(true);
        }

        // re-enable line wrpaping ?
        if (this.options.linewrap === false){
            this.terminal.lineWrapping(true);
        }

        // reset cursor
        this.terminal.cursorRelativeReset();

        // trigger event
        this.emit('stop-pre-clear');

        // clear line on complete ?
        if (this.options.clearOnComplete){
            // clear all bars
            this.terminal.clearBottom();
            
        // or show final progress ?
        }else{
            // update each bar
            for (let i=0; i< this.bars.length; i++){
                // add new line ?
                if (i > 0){
                    this.terminal.newline();
                }

                // trigger final rendering
                this.bars[i].render();

                // stop
                this.bars[i].stop();
            }

            // new line on complete
            this.terminal.newline();
        }

        // trigger event
        this.emit('stop');
    }

    log(s){
        // push content into logging buffer
        this.loggingBuffer.push(s);
    }
}
