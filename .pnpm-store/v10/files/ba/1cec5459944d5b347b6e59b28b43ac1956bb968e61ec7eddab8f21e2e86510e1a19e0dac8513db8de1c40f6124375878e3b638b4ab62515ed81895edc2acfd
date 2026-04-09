/**
 * Warning from the model.
 *
 * For example, that certain features are unsupported or compatibility
 * functionality is used (which might lead to suboptimal results).
 */
export type SharedV3Warning =
  | {
      /**
       * A feature is not supported by the model.
       */
      type: 'unsupported';

      /**
       * The feature that is not supported.
       */
      feature: string;

      /**
       * Additional details about the warning.
       */
      details?: string;
    }
  | {
      /**
       * A compatibility feature is used that might lead to suboptimal results.
       */
      type: 'compatibility';

      /**
       * The feature that is used in a compatibility mode.
       */
      feature: string;

      /**
       * Additional details about the warning.
       */
      details?: string;
    }
  | {
      /**
       * Other warning.
       */
      type: 'other';

      /**
       * The message of the warning.
       */
      message: string;
    };
