/* basic entropy accumulator */
var accum = (function() {

    var pool,    // randomness pool
        time,    // start timestamp
        last;    // last step timestamp

    /* initialize with default pool */
    function init() {
        pool = [];
        time = new Date().getTime();
        last = time;
        // use Math.random
        pool.push((Math.random() * 0xffffffff)|0);
        // use current time
        pool.push(time|0);
    }

    /* perform one step */
    function step() {
        if (!to)
            return;
        if (pool.length >= 255) { // stop at 255 values (1 more is added on fetch)
            stop();
            return;
        }
        var now = new Date().getTime();
        // use actual time difference
        pool.push(now-last);
        // always compute, occasionally use Math.random
        var rnd = (Math.random() * 0xffffffff)|0;
        if (now % 2)
            pool[pool.length-1] += rnd;
        last = now;
        to = setTimeout(step, 100+Math.random()*512); // use hypothetical time difference
    }

    var to = null;

    /* starts accumulating */
    function start() {
        if (to) return;
        to = setTimeout(step, 100+Math.random()*512);
        if (console.log)
            console.log("bcrypt-isaac: collecting entropy...");
        // install collectors
        if (typeof window !== 'undefined' && window && window.addEventListener)
            window.addEventListener("load", loadCollector, false),
            window.addEventListener("mousemove", mouseCollector, false),
            window.addEventListener("touchmove", touchCollector, false);
        else if (typeof document !== 'undefined' && document && document.attachEvent)
            document.attachEvent("onload", loadCollector),
            document.attachEvent("onmousemove", mouseCollector);
    }

    /* stops accumulating */
    function stop() {
        if (!to) return;
        clearTimeout(to); to = null;
        // uninstall collectors
        if (typeof window !== 'undefined' && window && window.removeEventListener)
            window.removeEventListener("load", loadCollector, false),
            window.removeEventListener("mousemove", mouseCollector, false),
            window.removeEventListener("touchmove", touchCollector, false);
        else if (typeof document !== 'undefined' && document && document.detachEvent)
            document.detachEvent("onload", loadCollector),
            document.detachEvent("onmousemove", mouseCollector);
    }

    /* fetches the randomness pool */
    function fetch() {
        // add overall time difference
        pool.push((new Date().getTime()-time)|0);
        var res = pool;
        init();
        if (console.log)
            console.log("bcrypt-isaac: using "+res.length+"/256 samples of entropy");
        // console.log(res);
        return res;
    }

    /* adds the current time to the top of the pool */
    function addTime() {
        pool[pool.length-1] += new Date().getTime() - time;
    }

    /* page load collector */
    function loadCollector() {
        if (!to || pool.length >= 255)
            return;
        pool.push(0);
        addTime();
    }

    /* mouse events collector */
    function mouseCollector(ev) {
        if (!to || pool.length >= 255)
            return;
        try {
            var x = ev.x || ev.clientX || ev.offsetX || 0,
                y = ev.y || ev.clientY || ev.offsetY || 0;
            if (x != 0 || y != 0)
                pool[pool.length-1] += ((x-mouseCollector.last[0]) ^ (y-mouseCollector.last[1])),
                addTime(),
                mouseCollector.last = [x,y];
        } catch (e) {}
    }
    mouseCollector.last = [0,0];

    /* touch events collector */
    function touchCollector(ev) {
        if (!to || pool.length >= 255)
            return;
        try {
            var touch = ev.touches[0] || ev.changedTouches[0];
            var x = touch.pageX || touch.clientX || 0,
                y = touch.pageY || touch.clientY || 0;
            if (x != 0 || y != 0)
                pool[pool.length-1] += (x-touchCollector.last[0]) ^ (y-touchCollector.last[1]),
                addTime(),
                touchCollector.last = [x,y];
        } catch (e) {}
    }
    touchCollector.last = [0,0];

    init();
    return {
        "start": start,
        "stop": stop,
        "fetch": fetch
    }

})();
