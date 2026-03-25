export class CommandBase {
    constructor(client) {
        this.client = client;
        this._errors = [];
    }
    get errors() {
        return this._errors;
    }
    addError(error) {
        this._errors = [...this.errors, error];
    }
    addErrors(errors) {
        this._errors = [...this.errors, ...errors];
    }
}
