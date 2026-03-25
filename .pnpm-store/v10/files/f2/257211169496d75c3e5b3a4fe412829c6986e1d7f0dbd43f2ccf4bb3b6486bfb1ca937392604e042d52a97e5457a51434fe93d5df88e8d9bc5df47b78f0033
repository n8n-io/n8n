/*
Language: GAUSS
Author: Matt Evans <matt@aptech.com>
Description: GAUSS Mathematical and Statistical language
Website: https://www.aptech.com
Category: scientific
*/
function gauss(hljs) {
  const KEYWORDS = {
    keyword: 'bool break call callexe checkinterrupt clear clearg closeall cls comlog compile '
              + 'continue create debug declare delete disable dlibrary dllcall do dos ed edit else '
              + 'elseif enable end endfor endif endp endo errorlog errorlogat expr external fn '
              + 'for format goto gosub graph if keyword let lib library line load loadarray loadexe '
              + 'loadf loadk loadm loadp loads loadx local locate loopnextindex lprint lpwidth lshow '
              + 'matrix msym ndpclex new open output outwidth plot plotsym pop prcsn print '
              + 'printdos proc push retp return rndcon rndmod rndmult rndseed run save saveall screen '
              + 'scroll setarray show sparse stop string struct system trace trap threadfor '
              + 'threadendfor threadbegin threadjoin threadstat threadend until use while winprint '
              + 'ne ge le gt lt and xor or not eq eqv',
    built_in: 'abs acf aconcat aeye amax amean AmericanBinomCall AmericanBinomCall_Greeks AmericanBinomCall_ImpVol '
              + 'AmericanBinomPut AmericanBinomPut_Greeks AmericanBinomPut_ImpVol AmericanBSCall AmericanBSCall_Greeks '
              + 'AmericanBSCall_ImpVol AmericanBSPut AmericanBSPut_Greeks AmericanBSPut_ImpVol amin amult annotationGetDefaults '
              + 'annotationSetBkd annotationSetFont annotationSetLineColor annotationSetLineStyle annotationSetLineThickness '
              + 'annualTradingDays arccos arcsin areshape arrayalloc arrayindex arrayinit arraytomat asciiload asclabel astd '
              + 'astds asum atan atan2 atranspose axmargin balance band bandchol bandcholsol bandltsol bandrv bandsolpd bar '
              + 'base10 begwind besselj bessely beta box boxcox cdfBeta cdfBetaInv cdfBinomial cdfBinomialInv cdfBvn cdfBvn2 '
              + 'cdfBvn2e cdfCauchy cdfCauchyInv cdfChic cdfChii cdfChinc cdfChincInv cdfExp cdfExpInv cdfFc cdfFnc cdfFncInv '
              + 'cdfGam cdfGenPareto cdfHyperGeo cdfLaplace cdfLaplaceInv cdfLogistic cdfLogisticInv cdfmControlCreate cdfMvn '
              + 'cdfMvn2e cdfMvnce cdfMvne cdfMvt2e cdfMvtce cdfMvte cdfN cdfN2 cdfNc cdfNegBinomial cdfNegBinomialInv cdfNi '
              + 'cdfPoisson cdfPoissonInv cdfRayleigh cdfRayleighInv cdfTc cdfTci cdfTnc cdfTvn cdfWeibull cdfWeibullInv cdir '
              + 'ceil ChangeDir chdir chiBarSquare chol choldn cholsol cholup chrs close code cols colsf combinate combinated '
              + 'complex con cond conj cons ConScore contour conv convertsatostr convertstrtosa corrm corrms corrvc corrx corrxs '
              + 'cos cosh counts countwts crossprd crout croutp csrcol csrlin csvReadM csvReadSA cumprodc cumsumc curve cvtos '
              + 'datacreate datacreatecomplex datalist dataload dataloop dataopen datasave date datestr datestring datestrymd '
              + 'dayinyr dayofweek dbAddDatabase dbClose dbCommit dbCreateQuery dbExecQuery dbGetConnectOptions dbGetDatabaseName '
              + 'dbGetDriverName dbGetDrivers dbGetHostName dbGetLastErrorNum dbGetLastErrorText dbGetNumericalPrecPolicy '
              + 'dbGetPassword dbGetPort dbGetTableHeaders dbGetTables dbGetUserName dbHasFeature dbIsDriverAvailable dbIsOpen '
              + 'dbIsOpenError dbOpen dbQueryBindValue dbQueryClear dbQueryCols dbQueryExecPrepared dbQueryFetchAllM dbQueryFetchAllSA '
              + 'dbQueryFetchOneM dbQueryFetchOneSA dbQueryFinish dbQueryGetBoundValue dbQueryGetBoundValues dbQueryGetField '
              + 'dbQueryGetLastErrorNum dbQueryGetLastErrorText dbQueryGetLastInsertID dbQueryGetLastQuery dbQueryGetPosition '
              + 'dbQueryIsActive dbQueryIsForwardOnly dbQueryIsNull dbQueryIsSelect dbQueryIsValid dbQueryPrepare dbQueryRows '
              + 'dbQuerySeek dbQuerySeekFirst dbQuerySeekLast dbQuerySeekNext dbQuerySeekPrevious dbQuerySetForwardOnly '
              + 'dbRemoveDatabase dbRollback dbSetConnectOptions dbSetDatabaseName dbSetHostName dbSetNumericalPrecPolicy '
              + 'dbSetPort dbSetUserName dbTransaction DeleteFile delif delrows denseToSp denseToSpRE denToZero design det detl '
              + 'dfft dffti diag diagrv digamma doswin DOSWinCloseall DOSWinOpen dotfeq dotfeqmt dotfge dotfgemt dotfgt dotfgtmt '
              + 'dotfle dotflemt dotflt dotfltmt dotfne dotfnemt draw drop dsCreate dstat dstatmt dstatmtControlCreate dtdate dtday '
              + 'dttime dttodtv dttostr dttoutc dtvnormal dtvtodt dtvtoutc dummy dummybr dummydn eig eigh eighv eigv elapsedTradingDays '
              + 'endwind envget eof eqSolve eqSolvemt eqSolvemtControlCreate eqSolvemtOutCreate eqSolveset erf erfc erfccplx erfcplx error '
              + 'etdays ethsec etstr EuropeanBinomCall EuropeanBinomCall_Greeks EuropeanBinomCall_ImpVol EuropeanBinomPut '
              + 'EuropeanBinomPut_Greeks EuropeanBinomPut_ImpVol EuropeanBSCall EuropeanBSCall_Greeks EuropeanBSCall_ImpVol '
              + 'EuropeanBSPut EuropeanBSPut_Greeks EuropeanBSPut_ImpVol exctsmpl exec execbg exp extern eye fcheckerr fclearerr feq '
              + 'feqmt fflush fft ffti fftm fftmi fftn fge fgemt fgets fgetsa fgetsat fgetst fgt fgtmt fileinfo filesa fle flemt '
              + 'floor flt fltmt fmod fne fnemt fonts fopen formatcv formatnv fputs fputst fseek fstrerror ftell ftocv ftos ftostrC '
              + 'gamma gammacplx gammaii gausset gdaAppend gdaCreate gdaDStat gdaDStatMat gdaGetIndex gdaGetName gdaGetNames gdaGetOrders '
              + 'gdaGetType gdaGetTypes gdaGetVarInfo gdaIsCplx gdaLoad gdaPack gdaRead gdaReadByIndex gdaReadSome gdaReadSparse '
              + 'gdaReadStruct gdaReportVarInfo gdaSave gdaUpdate gdaUpdateAndPack gdaVars gdaWrite gdaWrite32 gdaWriteSome getarray '
              + 'getdims getf getGAUSShome getmatrix getmatrix4D getname getnamef getNextTradingDay getNextWeekDay getnr getorders '
              + 'getpath getPreviousTradingDay getPreviousWeekDay getRow getscalar3D getscalar4D getTrRow getwind glm gradcplx gradMT '
              + 'gradMTm gradMTT gradMTTm gradp graphprt graphset hasimag header headermt hess hessMT hessMTg hessMTgw hessMTm '
              + 'hessMTmw hessMTT hessMTTg hessMTTgw hessMTTm hessMTw hessp hist histf histp hsec imag indcv indexcat indices indices2 '
              + 'indicesf indicesfn indnv indsav integrate1d integrateControlCreate intgrat2 intgrat3 inthp1 inthp2 inthp3 inthp4 '
              + 'inthpControlCreate intquad1 intquad2 intquad3 intrleav intrleavsa intrsect intsimp inv invpd invswp iscplx iscplxf '
              + 'isden isinfnanmiss ismiss key keyav keyw lag lag1 lagn lapEighb lapEighi lapEighvb lapEighvi lapgEig lapgEigh lapgEighv '
              + 'lapgEigv lapgSchur lapgSvdcst lapgSvds lapgSvdst lapSvdcusv lapSvds lapSvdusv ldlp ldlsol linSolve listwise ln lncdfbvn '
              + 'lncdfbvn2 lncdfmvn lncdfn lncdfn2 lncdfnc lnfact lngammacplx lnpdfmvn lnpdfmvt lnpdfn lnpdft loadd loadstruct loadwind '
              + 'loess loessmt loessmtControlCreate log loglog logx logy lower lowmat lowmat1 ltrisol lu lusol machEpsilon make makevars '
              + 'makewind margin matalloc matinit mattoarray maxbytes maxc maxindc maxv maxvec mbesselei mbesselei0 mbesselei1 mbesseli '
              + 'mbesseli0 mbesseli1 meanc median mergeby mergevar minc minindc minv miss missex missrv moment momentd movingave '
              + 'movingaveExpwgt movingaveWgt nextindex nextn nextnevn nextwind ntos null null1 numCombinations ols olsmt olsmtControlCreate '
              + 'olsqr olsqr2 olsqrmt ones optn optnevn orth outtyp pacf packedToSp packr parse pause pdfCauchy pdfChi pdfExp pdfGenPareto '
              + 'pdfHyperGeo pdfLaplace pdfLogistic pdfn pdfPoisson pdfRayleigh pdfWeibull pi pinv pinvmt plotAddArrow plotAddBar plotAddBox '
              + 'plotAddHist plotAddHistF plotAddHistP plotAddPolar plotAddScatter plotAddShape plotAddTextbox plotAddTS plotAddXY plotArea '
              + 'plotBar plotBox plotClearLayout plotContour plotCustomLayout plotGetDefaults plotHist plotHistF plotHistP plotLayout '
              + 'plotLogLog plotLogX plotLogY plotOpenWindow plotPolar plotSave plotScatter plotSetAxesPen plotSetBar plotSetBarFill '
              + 'plotSetBarStacked plotSetBkdColor plotSetFill plotSetGrid plotSetLegend plotSetLineColor plotSetLineStyle plotSetLineSymbol '
              + 'plotSetLineThickness plotSetNewWindow plotSetTitle plotSetWhichYAxis plotSetXAxisShow plotSetXLabel plotSetXRange '
              + 'plotSetXTicInterval plotSetXTicLabel plotSetYAxisShow plotSetYLabel plotSetYRange plotSetZAxisShow plotSetZLabel '
              + 'plotSurface plotTS plotXY polar polychar polyeval polygamma polyint polymake polymat polymroot polymult polyroot '
              + 'pqgwin previousindex princomp printfm printfmt prodc psi putarray putf putvals pvCreate pvGetIndex pvGetParNames '
              + 'pvGetParVector pvLength pvList pvPack pvPacki pvPackm pvPackmi pvPacks pvPacksi pvPacksm pvPacksmi pvPutParVector '
              + 'pvTest pvUnpack QNewton QNewtonmt QNewtonmtControlCreate QNewtonmtOutCreate QNewtonSet QProg QProgmt QProgmtInCreate '
              + 'qqr qqre qqrep qr qre qrep qrsol qrtsol qtyr qtyre qtyrep quantile quantiled qyr qyre qyrep qz rank rankindx readr '
              + 'real reclassify reclassifyCuts recode recserar recsercp recserrc rerun rescale reshape rets rev rfft rffti rfftip rfftn '
              + 'rfftnp rfftp rndBernoulli rndBeta rndBinomial rndCauchy rndChiSquare rndCon rndCreateState rndExp rndGamma rndGeo rndGumbel '
              + 'rndHyperGeo rndi rndKMbeta rndKMgam rndKMi rndKMn rndKMnb rndKMp rndKMu rndKMvm rndLaplace rndLCbeta rndLCgam rndLCi rndLCn '
              + 'rndLCnb rndLCp rndLCu rndLCvm rndLogNorm rndMTu rndMVn rndMVt rndn rndnb rndNegBinomial rndp rndPoisson rndRayleigh '
              + 'rndStateSkip rndu rndvm rndWeibull rndWishart rotater round rows rowsf rref sampleData satostrC saved saveStruct savewind '
              + 'scale scale3d scalerr scalinfnanmiss scalmiss schtoc schur searchsourcepath seekr select selif seqa seqm setdif setdifsa '
              + 'setvars setvwrmode setwind shell shiftr sin singleindex sinh sleep solpd sortc sortcc sortd sorthc sorthcc sortind '
              + 'sortindc sortmc sortr sortrc spBiconjGradSol spChol spConjGradSol spCreate spDenseSubmat spDiagRvMat spEigv spEye spLDL '
              + 'spline spLU spNumNZE spOnes spreadSheetReadM spreadSheetReadSA spreadSheetWrite spScale spSubmat spToDense spTrTDense '
              + 'spTScalar spZeros sqpSolve sqpSolveMT sqpSolveMTControlCreate sqpSolveMTlagrangeCreate sqpSolveMToutCreate sqpSolveSet '
              + 'sqrt statements stdc stdsc stocv stof strcombine strindx strlen strput strrindx strsect strsplit strsplitPad strtodt '
              + 'strtof strtofcplx strtriml strtrimr strtrunc strtruncl strtruncpad strtruncr submat subscat substute subvec sumc sumr '
              + 'surface svd svd1 svd2 svdcusv svds svdusv sysstate tab tan tanh tempname '
              + 'time timedt timestr timeutc title tkf2eps tkf2ps tocart todaydt toeplitz token topolar trapchk '
              + 'trigamma trimr trunc type typecv typef union unionsa uniqindx uniqindxsa unique uniquesa upmat upmat1 upper utctodt '
              + 'utctodtv utrisol vals varCovMS varCovXS varget vargetl varmall varmares varput varputl vartypef vcm vcms vcx vcxs '
              + 'vec vech vecr vector vget view viewxyz vlist vnamecv volume vput vread vtypecv wait waitc walkindex where window '
              + 'writer xlabel xlsGetSheetCount xlsGetSheetSize xlsGetSheetTypes xlsMakeRange xlsReadM xlsReadSA xlsWrite xlsWriteM '
              + 'xlsWriteSA xpnd xtics xy xyz ylabel ytics zeros zeta zlabel ztics cdfEmpirical dot h5create h5open h5read h5readAttribute '
              + 'h5write h5writeAttribute ldl plotAddErrorBar plotAddSurface plotCDFEmpirical plotSetColormap plotSetContourLabels '
              + 'plotSetLegendFont plotSetTextInterpreter plotSetXTicCount plotSetYTicCount plotSetZLevels powerm strjoin sylvester '
              + 'strtrim',
    literal: 'DB_AFTER_LAST_ROW DB_ALL_TABLES DB_BATCH_OPERATIONS DB_BEFORE_FIRST_ROW DB_BLOB DB_EVENT_NOTIFICATIONS '
             + 'DB_FINISH_QUERY DB_HIGH_PRECISION DB_LAST_INSERT_ID DB_LOW_PRECISION_DOUBLE DB_LOW_PRECISION_INT32 '
             + 'DB_LOW_PRECISION_INT64 DB_LOW_PRECISION_NUMBERS DB_MULTIPLE_RESULT_SETS DB_NAMED_PLACEHOLDERS '
             + 'DB_POSITIONAL_PLACEHOLDERS DB_PREPARED_QUERIES DB_QUERY_SIZE DB_SIMPLE_LOCKING DB_SYSTEM_TABLES DB_TABLES '
             + 'DB_TRANSACTIONS DB_UNICODE DB_VIEWS __STDIN __STDOUT __STDERR __FILE_DIR'
  };

  const AT_COMMENT_MODE = hljs.COMMENT('@', '@');

  const PREPROCESSOR =
  {
    className: 'meta',
    begin: '#',
    end: '$',
    keywords: { keyword: 'define definecs|10 undef ifdef ifndef iflight ifdllcall ifmac ifos2win ifunix else endif lineson linesoff srcfile srcline' },
    contains: [
      {
        begin: /\\\n/,
        relevance: 0
      },
      {
        beginKeywords: 'include',
        end: '$',
        keywords: { keyword: 'include' },
        contains: [
          {
            className: 'string',
            begin: '"',
            end: '"',
            illegal: '\\n'
          }
        ]
      },
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      AT_COMMENT_MODE
    ]
  };

  const STRUCT_TYPE =
  {
    begin: /\bstruct\s+/,
    end: /\s/,
    keywords: "struct",
    contains: [
      {
        className: "type",
        begin: hljs.UNDERSCORE_IDENT_RE,
        relevance: 0
      }
    ]
  };

  // only for definitions
  const PARSE_PARAMS = [
    {
      className: 'params',
      begin: /\(/,
      end: /\)/,
      excludeBegin: true,
      excludeEnd: true,
      endsWithParent: true,
      relevance: 0,
      contains: [
        { // dots
          className: 'literal',
          begin: /\.\.\./
        },
        hljs.C_NUMBER_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        AT_COMMENT_MODE,
        STRUCT_TYPE
      ]
    }
  ];

  const FUNCTION_DEF =
  {
    className: "title",
    begin: hljs.UNDERSCORE_IDENT_RE,
    relevance: 0
  };

  const DEFINITION = function(beginKeywords, end, inherits) {
    const mode = hljs.inherit(
      {
        className: "function",
        beginKeywords: beginKeywords,
        end: end,
        excludeEnd: true,
        contains: [].concat(PARSE_PARAMS)
      },
      {}
    );
    mode.contains.push(FUNCTION_DEF);
    mode.contains.push(hljs.C_NUMBER_MODE);
    mode.contains.push(hljs.C_BLOCK_COMMENT_MODE);
    mode.contains.push(AT_COMMENT_MODE);
    return mode;
  };

  const BUILT_IN_REF =
  { // these are explicitly named internal function calls
    className: 'built_in',
    begin: '\\b(' + KEYWORDS.built_in.split(' ').join('|') + ')\\b'
  };

  const STRING_REF =
  {
    className: 'string',
    begin: '"',
    end: '"',
    contains: [ hljs.BACKSLASH_ESCAPE ],
    relevance: 0
  };

  const FUNCTION_REF =
  {
    // className: "fn_ref",
    begin: hljs.UNDERSCORE_IDENT_RE + '\\s*\\(',
    returnBegin: true,
    keywords: KEYWORDS,
    relevance: 0,
    contains: [
      { beginKeywords: KEYWORDS.keyword },
      BUILT_IN_REF,
      { // ambiguously named function calls get a relevance of 0
        className: 'built_in',
        begin: hljs.UNDERSCORE_IDENT_RE,
        relevance: 0
      }
    ]
  };

  const FUNCTION_REF_PARAMS =
  {
    // className: "fn_ref_params",
    begin: /\(/,
    end: /\)/,
    relevance: 0,
    keywords: {
      built_in: KEYWORDS.built_in,
      literal: KEYWORDS.literal
    },
    contains: [
      hljs.C_NUMBER_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      AT_COMMENT_MODE,
      BUILT_IN_REF,
      FUNCTION_REF,
      STRING_REF,
      'self'
    ]
  };

  FUNCTION_REF.contains.push(FUNCTION_REF_PARAMS);

  return {
    name: 'GAUSS',
    aliases: [ 'gss' ],
    case_insensitive: true, // language is case-insensitive
    keywords: KEYWORDS,
    illegal: /(\{[%#]|[%#]\}| <- )/,
    contains: [
      hljs.C_NUMBER_MODE,
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      AT_COMMENT_MODE,
      STRING_REF,
      PREPROCESSOR,
      {
        className: 'keyword',
        begin: /\bexternal (matrix|string|array|sparse matrix|struct|proc|keyword|fn)/
      },
      DEFINITION('proc keyword', ';'),
      DEFINITION('fn', '='),
      {
        beginKeywords: 'for threadfor',
        end: /;/,
        // end: /\(/,
        relevance: 0,
        contains: [
          hljs.C_BLOCK_COMMENT_MODE,
          AT_COMMENT_MODE,
          FUNCTION_REF_PARAMS
        ]
      },
      { // custom method guard
        // excludes method names from keyword processing
        variants: [
          { begin: hljs.UNDERSCORE_IDENT_RE + '\\.' + hljs.UNDERSCORE_IDENT_RE },
          { begin: hljs.UNDERSCORE_IDENT_RE + '\\s*=' }
        ],
        relevance: 0
      },
      FUNCTION_REF,
      STRUCT_TYPE
    ]
  };
}

module.exports = gauss;
