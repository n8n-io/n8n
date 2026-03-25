/*
Language: IRPF90
Author: Anthony Scemama <scemama@irsamc.ups-tlse.fr>
Description: IRPF90 is an open-source Fortran code generator
Website: http://irpf90.ups-tlse.fr
Category: scientific
*/

/** @type LanguageFn */
function irpf90(hljs) {
  const regex = hljs.regex;
  const PARAMS = {
    className: 'params',
    begin: '\\(',
    end: '\\)'
  };

  // regex in both fortran and irpf90 should match
  const OPTIONAL_NUMBER_SUFFIX = /(_[a-z_\d]+)?/;
  const OPTIONAL_NUMBER_EXP = /([de][+-]?\d+)?/;
  const NUMBER = {
    className: 'number',
    variants: [
      { begin: regex.concat(/\b\d+/, /\.(\d*)/, OPTIONAL_NUMBER_EXP, OPTIONAL_NUMBER_SUFFIX) },
      { begin: regex.concat(/\b\d+/, OPTIONAL_NUMBER_EXP, OPTIONAL_NUMBER_SUFFIX) },
      { begin: regex.concat(/\.\d+/, OPTIONAL_NUMBER_EXP, OPTIONAL_NUMBER_SUFFIX) }
    ],
    relevance: 0
  };

  const F_KEYWORDS = {
    literal: '.False. .True.',
    keyword: 'kind do while private call intrinsic where elsewhere '
      + 'type endtype endmodule endselect endinterface end enddo endif if forall endforall only contains default return stop then '
      + 'public subroutine|10 function program .and. .or. .not. .le. .eq. .ge. .gt. .lt. '
      + 'goto save else use module select case '
      + 'access blank direct exist file fmt form formatted iostat name named nextrec number opened rec recl sequential status unformatted unit '
      + 'continue format pause cycle exit '
      + 'c_null_char c_alert c_backspace c_form_feed flush wait decimal round iomsg '
      + 'synchronous nopass non_overridable pass protected volatile abstract extends import '
      + 'non_intrinsic value deferred generic final enumerator class associate bind enum '
      + 'c_int c_short c_long c_long_long c_signed_char c_size_t c_int8_t c_int16_t c_int32_t c_int64_t c_int_least8_t c_int_least16_t '
      + 'c_int_least32_t c_int_least64_t c_int_fast8_t c_int_fast16_t c_int_fast32_t c_int_fast64_t c_intmax_t C_intptr_t c_float c_double '
      + 'c_long_double c_float_complex c_double_complex c_long_double_complex c_bool c_char c_null_ptr c_null_funptr '
      + 'c_new_line c_carriage_return c_horizontal_tab c_vertical_tab iso_c_binding c_loc c_funloc c_associated  c_f_pointer '
      + 'c_ptr c_funptr iso_fortran_env character_storage_size error_unit file_storage_size input_unit iostat_end iostat_eor '
      + 'numeric_storage_size output_unit c_f_procpointer ieee_arithmetic ieee_support_underflow_control '
      + 'ieee_get_underflow_mode ieee_set_underflow_mode newunit contiguous recursive '
      + 'pad position action delim readwrite eor advance nml interface procedure namelist include sequence elemental pure '
      + 'integer real character complex logical dimension allocatable|10 parameter '
      + 'external implicit|10 none double precision assign intent optional pointer '
      + 'target in out common equivalence data '
      // IRPF90 special keywords
      + 'begin_provider &begin_provider end_provider begin_shell end_shell begin_template end_template subst assert touch '
      + 'soft_touch provide no_dep free irp_if irp_else irp_endif irp_write irp_read',
    built_in: 'alog alog10 amax0 amax1 amin0 amin1 amod cabs ccos cexp clog csin csqrt dabs dacos dasin datan datan2 dcos dcosh ddim dexp dint '
      + 'dlog dlog10 dmax1 dmin1 dmod dnint dsign dsin dsinh dsqrt dtan dtanh float iabs idim idint idnint ifix isign max0 max1 min0 min1 sngl '
      + 'algama cdabs cdcos cdexp cdlog cdsin cdsqrt cqabs cqcos cqexp cqlog cqsin cqsqrt dcmplx dconjg derf derfc dfloat dgamma dimag dlgama '
      + 'iqint qabs qacos qasin qatan qatan2 qcmplx qconjg qcos qcosh qdim qerf qerfc qexp qgamma qimag qlgama qlog qlog10 qmax1 qmin1 qmod '
      + 'qnint qsign qsin qsinh qsqrt qtan qtanh abs acos aimag aint anint asin atan atan2 char cmplx conjg cos cosh exp ichar index int log '
      + 'log10 max min nint sign sin sinh sqrt tan tanh print write dim lge lgt lle llt mod nullify allocate deallocate '
      + 'adjustl adjustr all allocated any associated bit_size btest ceiling count cshift date_and_time digits dot_product '
      + 'eoshift epsilon exponent floor fraction huge iand ibclr ibits ibset ieor ior ishft ishftc lbound len_trim matmul '
      + 'maxexponent maxloc maxval merge minexponent minloc minval modulo mvbits nearest pack present product '
      + 'radix random_number random_seed range repeat reshape rrspacing scale scan selected_int_kind selected_real_kind '
      + 'set_exponent shape size spacing spread sum system_clock tiny transpose trim ubound unpack verify achar iachar transfer '
      + 'dble entry dprod cpu_time command_argument_count get_command get_command_argument get_environment_variable is_iostat_end '
      + 'ieee_arithmetic ieee_support_underflow_control ieee_get_underflow_mode ieee_set_underflow_mode '
      + 'is_iostat_eor move_alloc new_line selected_char_kind same_type_as extends_type_of '
      + 'acosh asinh atanh bessel_j0 bessel_j1 bessel_jn bessel_y0 bessel_y1 bessel_yn erf erfc erfc_scaled gamma log_gamma hypot norm2 '
      + 'atomic_define atomic_ref execute_command_line leadz trailz storage_size merge_bits '
      + 'bge bgt ble blt dshiftl dshiftr findloc iall iany iparity image_index lcobound ucobound maskl maskr '
      + 'num_images parity popcnt poppar shifta shiftl shiftr this_image '
      // IRPF90 special built_ins
      + 'IRP_ALIGN irp_here'
  };
  return {
    name: 'IRPF90',
    case_insensitive: true,
    keywords: F_KEYWORDS,
    illegal: /\/\*/,
    contains: [
      hljs.inherit(hljs.APOS_STRING_MODE, {
        className: 'string',
        relevance: 0
      }),
      hljs.inherit(hljs.QUOTE_STRING_MODE, {
        className: 'string',
        relevance: 0
      }),
      {
        className: 'function',
        beginKeywords: 'subroutine function program',
        illegal: '[${=\\n]',
        contains: [
          hljs.UNDERSCORE_TITLE_MODE,
          PARAMS
        ]
      },
      hljs.COMMENT('!', '$', { relevance: 0 }),
      hljs.COMMENT('begin_doc', 'end_doc', { relevance: 10 }),
      NUMBER
    ]
  };
}

module.exports = irpf90;
