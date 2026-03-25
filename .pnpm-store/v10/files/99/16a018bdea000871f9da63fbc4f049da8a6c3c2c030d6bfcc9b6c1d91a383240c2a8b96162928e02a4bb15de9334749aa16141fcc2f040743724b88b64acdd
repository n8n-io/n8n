
// ETA calculation
class ETA{

    constructor(length, initTime, initValue){
        // size of eta buffer
        this.etaBufferLength = length || 100;

        // eta buffer with initial values
        this.valueBuffer = [initValue];
        this.timeBuffer = [initTime];

        // eta time value
        this.eta = '0';
    }

    // add new values to calculation buffer
    update(time, value, total){
        this.valueBuffer.push(value);
        this.timeBuffer.push(time);

        // trigger recalculation
        this.calculate(total-value);
    }

    // fetch estimated time
    getTime(){
        return this.eta;
    }

    // eta calculation - request number of remaining events
    calculate(remaining){
        // get number of samples in eta buffer
        const currentBufferSize = this.valueBuffer.length;
        const buffer = Math.min(this.etaBufferLength, currentBufferSize);

        const v_diff = this.valueBuffer[currentBufferSize - 1] - this.valueBuffer[currentBufferSize - buffer];
        const t_diff = this.timeBuffer[currentBufferSize - 1] - this.timeBuffer[currentBufferSize - buffer];

        // get progress per ms
        const vt_rate = v_diff/t_diff;

        // strip past elements
        this.valueBuffer = this.valueBuffer.slice(-this.etaBufferLength);
        this.timeBuffer  = this.timeBuffer.slice(-this.etaBufferLength);

        // eq: vt_rate *x = total
        const eta = Math.ceil(remaining/vt_rate/1000);

        // check values
        if (isNaN(eta)){
            this.eta = 'NULL';

        // +/- Infinity --- NaN already handled
        }else if (!isFinite(eta)){
            this.eta = 'INF';

        // > 10M s ? - set upper display limit ~115days (1e7/60/60/24)
        }else if (eta > 1e7){
            this.eta = 'INF';

        // negative ?
        }else if (eta < 0){
            this.eta = 0;

        }else{
            // assign
            this.eta = eta;
        }
    }
}

module.exports = ETA;