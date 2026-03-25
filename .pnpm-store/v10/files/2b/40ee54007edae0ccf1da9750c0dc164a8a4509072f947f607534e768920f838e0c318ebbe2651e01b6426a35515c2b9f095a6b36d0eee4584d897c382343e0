/*
Language: Stan
Description: The Stan probabilistic programming language
Author: Sean Pinkney <sean.pinkney@gmail.com>
Website: http://mc-stan.org/
Category: scientific
*/

function stan(hljs) {
  const regex = hljs.regex;
  // variable names cannot conflict with block identifiers
  const BLOCKS = [
    'functions',
    'model',
    'data',
    'parameters',
    'quantities',
    'transformed',
    'generated'
  ];

  const STATEMENTS = [
    'for',
    'in',
    'if',
    'else',
    'while',
    'break',
    'continue',
    'return'
  ];

  const TYPES = [
    'array',
    'complex',
    'int',
    'real',
    'vector',
    'ordered',
    'positive_ordered',
    'simplex',
    'unit_vector',
    'row_vector',
    'matrix',
    'cholesky_factor_corr|10',
    'cholesky_factor_cov|10',
    'corr_matrix|10',
    'cov_matrix|10',
    'void'
  ];

  // to get the functions list
  // clone the [stan-docs repo](https://github.com/stan-dev/docs)
  // then cd into it and run this bash script https://gist.github.com/joshgoebel/dcd33f82d4059a907c986049893843cf
  //
  // the output files are
  // distributions_quoted.txt
  // functions_quoted.txt

  const FUNCTIONS = [
    'Phi',
    'Phi_approx',
    'abs',
    'acos',
    'acosh',
    'add_diag',
    'algebra_solver',
    'algebra_solver_newton',
    'append_array',
    'append_col',
    'append_row',
    'asin',
    'asinh',
    'atan',
    'atan2',
    'atanh',
    'bessel_first_kind',
    'bessel_second_kind',
    'binary_log_loss',
    'binomial_coefficient_log',
    'block',
    'cbrt',
    'ceil',
    'chol2inv',
    'cholesky_decompose',
    'choose',
    'col',
    'cols',
    'columns_dot_product',
    'columns_dot_self',
    'conj',
    'cos',
    'cosh',
    'cov_exp_quad',
    'crossprod',
    'csr_extract_u',
    'csr_extract_v',
    'csr_extract_w',
    'csr_matrix_times_vector',
    'csr_to_dense_matrix',
    'cumulative_sum',
    'determinant',
    'diag_matrix',
    'diag_post_multiply',
    'diag_pre_multiply',
    'diagonal',
    'digamma',
    'dims',
    'distance',
    'dot_product',
    'dot_self',
    'eigenvalues_sym',
    'eigenvectors_sym',
    'erf',
    'erfc',
    'exp',
    'exp2',
    'expm1',
    'fabs',
    'falling_factorial',
    'fdim',
    'floor',
    'fma',
    'fmax',
    'fmin',
    'fmod',
    'gamma_p',
    'gamma_q',
    'generalized_inverse',
    'get_imag',
    'get_lp',
    'get_real',
    'head',
    'hmm_hidden_state_prob',
    'hmm_marginal',
    'hypot',
    'identity_matrix',
    'inc_beta',
    'int_step',
    'integrate_1d',
    'integrate_ode',
    'integrate_ode_adams',
    'integrate_ode_bdf',
    'integrate_ode_rk45',
    'inv',
    'inv_Phi',
    'inv_cloglog',
    'inv_logit',
    'inv_sqrt',
    'inv_square',
    'inverse',
    'inverse_spd',
    'is_inf',
    'is_nan',
    'lambert_w0',
    'lambert_wm1',
    'lbeta',
    'lchoose',
    'ldexp',
    'lgamma',
    'linspaced_array',
    'linspaced_int_array',
    'linspaced_row_vector',
    'linspaced_vector',
    'lmgamma',
    'lmultiply',
    'log',
    'log1m',
    'log1m_exp',
    'log1m_inv_logit',
    'log1p',
    'log1p_exp',
    'log_determinant',
    'log_diff_exp',
    'log_falling_factorial',
    'log_inv_logit',
    'log_inv_logit_diff',
    'log_mix',
    'log_modified_bessel_first_kind',
    'log_rising_factorial',
    'log_softmax',
    'log_sum_exp',
    'logit',
    'machine_precision',
    'map_rect',
    'matrix_exp',
    'matrix_exp_multiply',
    'matrix_power',
    'max',
    'mdivide_left_spd',
    'mdivide_left_tri_low',
    'mdivide_right_spd',
    'mdivide_right_tri_low',
    'mean',
    'min',
    'modified_bessel_first_kind',
    'modified_bessel_second_kind',
    'multiply_log',
    'multiply_lower_tri_self_transpose',
    'negative_infinity',
    'norm',
    'not_a_number',
    'num_elements',
    'ode_adams',
    'ode_adams_tol',
    'ode_adjoint_tol_ctl',
    'ode_bdf',
    'ode_bdf_tol',
    'ode_ckrk',
    'ode_ckrk_tol',
    'ode_rk45',
    'ode_rk45_tol',
    'one_hot_array',
    'one_hot_int_array',
    'one_hot_row_vector',
    'one_hot_vector',
    'ones_array',
    'ones_int_array',
    'ones_row_vector',
    'ones_vector',
    'owens_t',
    'polar',
    'positive_infinity',
    'pow',
    'print',
    'prod',
    'proj',
    'qr_Q',
    'qr_R',
    'qr_thin_Q',
    'qr_thin_R',
    'quad_form',
    'quad_form_diag',
    'quad_form_sym',
    'quantile',
    'rank',
    'reduce_sum',
    'reject',
    'rep_array',
    'rep_matrix',
    'rep_row_vector',
    'rep_vector',
    'reverse',
    'rising_factorial',
    'round',
    'row',
    'rows',
    'rows_dot_product',
    'rows_dot_self',
    'scale_matrix_exp_multiply',
    'sd',
    'segment',
    'sin',
    'singular_values',
    'sinh',
    'size',
    'softmax',
    'sort_asc',
    'sort_desc',
    'sort_indices_asc',
    'sort_indices_desc',
    'sqrt',
    'square',
    'squared_distance',
    'step',
    'sub_col',
    'sub_row',
    'sum',
    'svd_U',
    'svd_V',
    'symmetrize_from_lower_tri',
    'tail',
    'tan',
    'tanh',
    'target',
    'tcrossprod',
    'tgamma',
    'to_array_1d',
    'to_array_2d',
    'to_complex',
    'to_matrix',
    'to_row_vector',
    'to_vector',
    'trace',
    'trace_gen_quad_form',
    'trace_quad_form',
    'trigamma',
    'trunc',
    'uniform_simplex',
    'variance',
    'zeros_array',
    'zeros_int_array',
    'zeros_row_vector'
  ];

  const DISTRIBUTIONS = [
    'bernoulli',
    'bernoulli_logit',
    'bernoulli_logit_glm',
    'beta',
    'beta_binomial',
    'beta_proportion',
    'binomial',
    'binomial_logit',
    'categorical',
    'categorical_logit',
    'categorical_logit_glm',
    'cauchy',
    'chi_square',
    'dirichlet',
    'discrete_range',
    'double_exponential',
    'exp_mod_normal',
    'exponential',
    'frechet',
    'gamma',
    'gaussian_dlm_obs',
    'gumbel',
    'hmm_latent',
    'hypergeometric',
    'inv_chi_square',
    'inv_gamma',
    'inv_wishart',
    'lkj_corr',
    'lkj_corr_cholesky',
    'logistic',
    'lognormal',
    'multi_gp',
    'multi_gp_cholesky',
    'multi_normal',
    'multi_normal_cholesky',
    'multi_normal_prec',
    'multi_student_t',
    'multinomial',
    'multinomial_logit',
    'neg_binomial',
    'neg_binomial_2',
    'neg_binomial_2_log',
    'neg_binomial_2_log_glm',
    'normal',
    'normal_id_glm',
    'ordered_logistic',
    'ordered_logistic_glm',
    'ordered_probit',
    'pareto',
    'pareto_type_2',
    'poisson',
    'poisson_log',
    'poisson_log_glm',
    'rayleigh',
    'scaled_inv_chi_square',
    'skew_double_exponential',
    'skew_normal',
    'std_normal',
    'student_t',
    'uniform',
    'von_mises',
    'weibull',
    'wiener',
    'wishart'
  ];

  const BLOCK_COMMENT = hljs.COMMENT(
    /\/\*/,
    /\*\//,
    {
      relevance: 0,
      contains: [
        {
          scope: 'doctag',
          match: /@(return|param)/
        }
      ]
    }
  );

  const INCLUDE = {
    scope: 'meta',
    begin: /#include\b/,
    end: /$/,
    contains: [
      {
        match: /[a-z][a-z-._]+/,
        scope: 'string'
      },
      hljs.C_LINE_COMMENT_MODE
    ]
  };

  const RANGE_CONSTRAINTS = [
    "lower",
    "upper",
    "offset",
    "multiplier"
  ];

  return {
    name: 'Stan',
    aliases: [ 'stanfuncs' ],
    keywords: {
      $pattern: hljs.IDENT_RE,
      title: BLOCKS,
      type: TYPES,
      keyword: STATEMENTS,
      built_in: FUNCTIONS
    },
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      INCLUDE,
      hljs.HASH_COMMENT_MODE,
      BLOCK_COMMENT,
      {
        scope: 'built_in',
        match: /\s(pi|e|sqrt2|log2|log10)(?=\()/,
        relevance: 0
      },
      {
        match: regex.concat(/[<,]\s*/, regex.either(...RANGE_CONSTRAINTS), /\s*=/),
        keywords: RANGE_CONSTRAINTS
      },
      {
        scope: 'keyword',
        match: /\btarget(?=\s*\+=)/,
      },
      {
        // highlights the 'T' in T[,] for only Stan language distributrions
        match: [
          /~\s*/,
          regex.either(...DISTRIBUTIONS),
          /(?:\(\))/,
          /\s*T(?=\s*\[)/
        ],
        scope: {
          2: "built_in",
          4: "keyword"
        }
      },
      {
        // highlights distributions that end with special endings
        scope: 'built_in',
        keywords: DISTRIBUTIONS,
        begin: regex.concat(/\w*/, regex.either(...DISTRIBUTIONS), /(_lpdf|_lupdf|_lpmf|_cdf|_lcdf|_lccdf|_qf)(?=\s*[\(.*\)])/)
      },
      {
        // highlights distributions after ~
        begin: [
          /~/,
          /\s*/,
          regex.concat(regex.either(...DISTRIBUTIONS), /(?=\s*[\(.*\)])/)
        ],
        scope: { 3: "built_in" }
      },
      {
        // highlights user defined distributions after ~
        begin: [
          /~/,
          /\s*\w+(?=\s*[\(.*\)])/,
          '(?!.*/\b(' + regex.either(...DISTRIBUTIONS) + ')\b)'
        ],
        scope: { 2: "title.function" }
      },
      {
        // highlights user defined distributions with special endings
        scope: 'title.function',
        begin: /\w*(_lpdf|_lupdf|_lpmf|_cdf|_lcdf|_lccdf|_qf)(?=\s*[\(.*\)])/
      },
      {
        scope: 'number',
        match: regex.concat(
          // Comes from @RunDevelopment accessed 11/29/2021 at
          // https://github.com/PrismJS/prism/blob/c53ad2e65b7193ab4f03a1797506a54bbb33d5a2/components/prism-stan.js#L56

          // start of big noncapture group which
          // 1. gets numbers that are by themselves
          // 2. numbers that are separated by _
          // 3. numbers that are separted by .
          /(?:\b\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\B\.\d+(?:_\d+)*)/,
          // grabs scientific notation
          // grabs complex numbers with i
          /(?:[eE][+-]?\d+(?:_\d+)*)?i?(?!\w)/
        ),
        relevance: 0
      },
      {
        scope: 'string',
        begin: /"/,
        end: /"/
      }
    ]
  };
}

export { stan as default };
