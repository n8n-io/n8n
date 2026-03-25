const Errors = require('../errors');

const ErrorCodes = Errors.codes;
const ARRAY = 'array';
const OBJECT = 'object';
const OBJECT_WITH_RENAMED_DUPLICATED_COLUMNS = 'object_with_renamed_duplicated_columns';

const isValidRowMode = (rowMode) => [ARRAY, OBJECT, OBJECT_WITH_RENAMED_DUPLICATED_COLUMNS].includes(rowMode);

const checkRowModeValid = (rowMode) => {
  Errors.checkArgumentValid(isValidRowMode(rowMode),
    ErrorCodes.ERR_STMT_STREAM_ROWS_INVALID_ROW_MODE, JSON.stringify(rowMode));
};

exports.ARRAY = ARRAY;
exports.OBJECT = OBJECT;
exports.OBJECT_WITH_RENAMED_DUPLICATED_COLUMNS = OBJECT_WITH_RENAMED_DUPLICATED_COLUMNS;
exports.isValidRowMode = isValidRowMode;
exports.checkRowModeValid = checkRowModeValid;