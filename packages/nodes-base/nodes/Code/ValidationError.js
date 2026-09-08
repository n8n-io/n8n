import { UserError } from 'n8n-workflow';
export class ValidationError extends UserError {
    description = '';
    itemIndex = undefined;
    context = undefined;
    lineNumber = undefined;
    constructor({ message, description, itemIndex, lineNumber, }) {
        super(message);
        this.lineNumber = lineNumber;
        this.itemIndex = itemIndex;
        if (this.lineNumber !== undefined && this.itemIndex !== undefined) {
            this.message = `${message} [line ${lineNumber}, for item ${itemIndex}]`;
        }
        else if (this.lineNumber !== undefined) {
            this.message = `${message} [line ${lineNumber}]`;
        }
        else if (this.itemIndex !== undefined) {
            this.message = `${message} [item ${itemIndex}]`;
        }
        else {
            this.message = message;
        }
        this.description = description;
        if (this.itemIndex !== undefined) {
            this.context = { itemIndex: this.itemIndex };
        }
    }
}
//# sourceMappingURL=ValidationError.js.map