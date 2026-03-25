import type { BaseArgs, Options } from "../../types.js";
export type TabularRegressionArgs = BaseArgs & {
    inputs: {
        /**
         * A table of data represented as a dict of list where entries are headers and the lists are all the values, all lists must have the same size.
         */
        data: Record<string, string[]>;
    };
};
/**
 * a list of predicted values for each row
 */
export type TabularRegressionOutput = number[];
/**
 * Predicts target value for a given set of features in tabular form.
 * Typically, you will want to train a regression model on your training data and use it with your new data of the same format.
 * Example model: scikit-learn/Fish-Weight
 */
export declare function tabularRegression(args: TabularRegressionArgs, options?: Options): Promise<TabularRegressionOutput>;
//# sourceMappingURL=tabularRegression.d.ts.map