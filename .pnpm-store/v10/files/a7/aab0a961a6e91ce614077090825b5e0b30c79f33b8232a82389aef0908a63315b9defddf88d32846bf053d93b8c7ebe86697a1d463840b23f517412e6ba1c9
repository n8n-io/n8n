/*
 * Copyright (c) 2015-present, Vitaly Tomilov
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

const {QueryResultError, queryResultErrorCode} = require('./query-result-error');
const {PreparedStatementError} = require('./prepared-statement-error');
const {ParameterizedQueryError} = require('./parameterized-query-error');
const {QueryFileError} = require('./query-file-error');

/**
 * @namespace errors
 * @description
 * Error types namespace, available as `pgp.errors`, before and after initializing the library.
 *
 * @property {function} PreparedStatementError
 * {@link errors.PreparedStatementError PreparedStatementError} class constructor.
 *
 * Represents all errors that can be reported by class {@link PreparedStatement}.
 *
 * @property {function} ParameterizedQueryError
 * {@link errors.ParameterizedQueryError ParameterizedQueryError} class constructor.
 *
 * Represents all errors that can be reported by class {@link ParameterizedQuery}.
 *
 * @property {function} QueryFileError
 * {@link errors.QueryFileError QueryFileError} class constructor.
 *
 * Represents all errors that can be reported by class {@link QueryFile}.
 *
 * @property {function} QueryResultError
 * {@link errors.QueryResultError QueryResultError} class constructor.
 *
 * Represents all result-specific errors from query methods.
 *
 * @property {errors.queryResultErrorCode} queryResultErrorCode
 * Error codes `enum` used by class {@link errors.QueryResultError QueryResultError}.
 *
 */

module.exports = {
    QueryResultError,
    queryResultErrorCode,
    PreparedStatementError,
    ParameterizedQueryError,
    QueryFileError
};
