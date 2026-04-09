// HumanizeDuration.js - https://git.io/j0HgmQ

/**
 * @typedef {string | ((unitCount: number) => string)} Unit
 */

/**
 * @typedef {"y" | "mo" | "w" | "d" | "h" | "m" | "s" | "ms"} UnitName
 */

/**
 * @typedef {Object} UnitMeasures
 * @prop {number} y
 * @prop {number} mo
 * @prop {number} w
 * @prop {number} d
 * @prop {number} h
 * @prop {number} m
 * @prop {number} s
 * @prop {number} ms
 */

/**
 * @internal
 * @typedef {[string, string, string, string, string, string, string, string, string, string]} DigitReplacements
 */

/**
 * @typedef {Object} Language
 * @prop {Unit} y
 * @prop {Unit} mo
 * @prop {Unit} w
 * @prop {Unit} d
 * @prop {Unit} h
 * @prop {Unit} m
 * @prop {Unit} s
 * @prop {Unit} ms
 * @prop {string} [decimal]
 * @prop {string} [delimiter]
 * @prop {DigitReplacements} [_digitReplacements]
 * @prop {boolean} [_numberFirst]
 * @prop {boolean} [_hideCountIf2]
 */

/**
 * @typedef {Object} Options
 * @prop {string} [language]
 * @prop {Record<string, Language>} [languages]
 * @prop {string[]} [fallbacks]
 * @prop {string} [delimiter]
 * @prop {string} [spacer]
 * @prop {boolean} [round]
 * @prop {number} [largest]
 * @prop {UnitName[]} [units]
 * @prop {string} [decimal]
 * @prop {string} [conjunction]
 * @prop {number} [maxDecimalPoints]
 * @prop {UnitMeasures} [unitMeasures]
 * @prop {boolean} [serialComma]
 * @prop {DigitReplacements} [digitReplacements]
 */

/**
 * @internal
 * @typedef {Required<Options>} NormalizedOptions
 */

(function () {
  // Fallback for `Object.assign` if relevant.
  var assign =
    Object.assign ||
    /** @param {...any} destination */
    function (destination) {
      var source;
      for (var i = 1; i < arguments.length; i++) {
        source = arguments[i];
        for (var prop in source) {
          if (has(source, prop)) {
            destination[prop] = source[prop];
          }
        }
      }
      return destination;
    };

  // Fallback for `Array.isArray` if relevant.
  var isArray =
    Array.isArray ||
    function (arg) {
      return Object.prototype.toString.call(arg) === "[object Array]";
    };

  // This has to be defined separately because of a bug: we want to alias
  // `gr` and `el` for backwards-compatiblity. In a breaking change, we can
  // remove `gr` entirely.
  // See https://github.com/EvanHahn/HumanizeDuration.js/issues/143 for more.
  var GREEK = onesLanguage(
    ["χρόνος", "χρόνια"],
    ["μήνας", "μήνες"],
    ["εβδομάδα", "εβδομάδες"],
    ["μέρα", "μέρες"],
    ["ώρα", "ώρες"],
    ["λεπτό", "λεπτά"],
    ["δευτερόλεπτο", "δευτερόλεπτα"],
    ["χιλιοστό του δευτερολέπτου", "χιλιοστά του δευτερολέπτου"],
    ","
  );

  /**
   * @internal
   * @type {Record<string, Language>}
   */
  var LANGUAGES = {
    af: onesLanguage(
      ["jaar", "jaar"],
      ["maand", "maande"],
      ["week", "weke"],
      ["dag", "dae"],
      ["uur", "ure"],
      ["minuut", "minute"],
      ["sekonde", "sekondes"],
      ["millisekonde", "millisekondes"],
      ","
    ),
    am: language("ዓመት", "ወር", "ሳምንት", "ቀን", "ሰዓት", "ደቂቃ", "ሰከንድ", "ሚሊሰከንድ"),
    ar: assign(
      language(
        function (c) {
          return ["سنة", "سنتان", "سنوات"][getArabicForm(c)];
        },
        function (c) {
          return ["شهر", "شهران", "أشهر"][getArabicForm(c)];
        },
        function (c) {
          return ["أسبوع", "أسبوعين", "أسابيع"][getArabicForm(c)];
        },
        function (c) {
          return ["يوم", "يومين", "أيام"][getArabicForm(c)];
        },
        function (c) {
          return ["ساعة", "ساعتين", "ساعات"][getArabicForm(c)];
        },
        function (c) {
          return ["دقيقة", "دقيقتان", "دقائق"][getArabicForm(c)];
        },
        function (c) {
          return ["ثانية", "ثانيتان", "ثواني"][getArabicForm(c)];
        },
        function (c) {
          return ["جزء من الثانية", "جزآن من الثانية", "أجزاء من الثانية"][
            getArabicForm(c)
          ];
        },
        ","
      ),
      {
        delimiter: " ﻭ ",
        _hideCountIf2: true,
        _digitReplacements: ["۰", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"]
      }
    ),
    bg: slavicLanguage(
      ["години", "година", "години"],
      ["месеца", "месец", "месеца"],
      ["седмици", "седмица", "седмици"],
      ["дни", "ден", "дни"],
      ["часа", "час", "часа"],
      ["минути", "минута", "минути"],
      ["секунди", "секунда", "секунди"],
      ["милисекунди", "милисекунда", "милисекунди"]
    ),
    bn: language(
      "বছর",
      "মাস",
      "সপ্তাহ",
      "দিন",
      "ঘন্টা",
      "মিনিট",
      "সেকেন্ড",
      "মিলিসেকেন্ড"
    ),
    ca: onesLanguage(
      ["any", "anys"],
      ["mes", "mesos"],
      ["setmana", "setmanes"],
      ["dia", "dies"],
      ["hora", "hores"],
      ["minut", "minuts"],
      ["segon", "segons"],
      ["milisegon", "milisegons"],
      ","
    ),
    ckb: language(
      "ساڵ",
      "مانگ",
      "هەفتە",
      "ڕۆژ",
      "کاژێر",
      "خولەک",
      "چرکە",
      "میلی چرکە",
      "."
    ),
    cs: language(
      function (c) {
        return ["rok", "roku", "roky", "let"][getCzechOrSlovakForm(c)];
      },
      function (c) {
        return ["měsíc", "měsíce", "měsíce", "měsíců"][getCzechOrSlovakForm(c)];
      },
      function (c) {
        return ["týden", "týdne", "týdny", "týdnů"][getCzechOrSlovakForm(c)];
      },
      function (c) {
        return ["den", "dne", "dny", "dní"][getCzechOrSlovakForm(c)];
      },
      function (c) {
        return ["hodina", "hodiny", "hodiny", "hodin"][getCzechOrSlovakForm(c)];
      },
      function (c) {
        return ["minuta", "minuty", "minuty", "minut"][getCzechOrSlovakForm(c)];
      },
      function (c) {
        return ["sekunda", "sekundy", "sekundy", "sekund"][
          getCzechOrSlovakForm(c)
        ];
      },
      function (c) {
        return ["milisekunda", "milisekundy", "milisekundy", "milisekund"][
          getCzechOrSlovakForm(c)
        ];
      },
      ","
    ),
    cy: language(
      "flwyddyn",
      "mis",
      "wythnos",
      "diwrnod",
      "awr",
      "munud",
      "eiliad",
      "milieiliad"
    ),
    da: onesLanguage(
      ["år", "år"],
      ["måned", "måneder"],
      ["uge", "uger"],
      ["dag", "dage"],
      ["time", "timer"],
      ["minut", "minutter"],
      ["sekund", "sekunder"],
      ["millisekund", "millisekunder"],
      ","
    ),
    de: onesLanguage(
      ["Jahr", "Jahre"],
      ["Monat", "Monate"],
      ["Woche", "Wochen"],
      ["Tag", "Tage"],
      ["Stunde", "Stunden"],
      ["Minute", "Minuten"],
      ["Sekunde", "Sekunden"],
      ["Millisekunde", "Millisekunden"],
      ","
    ),
    el: GREEK,
    en: onesLanguage(
      ["year", "years"],
      ["month", "months"],
      ["week", "weeks"],
      ["day", "days"],
      ["hour", "hours"],
      ["minute", "minutes"],
      ["second", "seconds"],
      ["millisecond", "milliseconds"]
    ),
    eo: onesLanguage(
      ["jaro", "jaroj"],
      ["monato", "monatoj"],
      ["semajno", "semajnoj"],
      ["tago", "tagoj"],
      ["horo", "horoj"],
      ["minuto", "minutoj"],
      ["sekundo", "sekundoj"],
      ["milisekundo", "milisekundoj"],
      ","
    ),
    es: onesLanguage(
      ["año", "años"],
      ["mes", "meses"],
      ["semana", "semanas"],
      ["día", "días"],
      ["hora", "horas"],
      ["minuto", "minutos"],
      ["segundo", "segundos"],
      ["milisegundo", "milisegundos"],
      ","
    ),
    et: onesLanguage(
      ["aasta", "aastat"],
      ["kuu", "kuud"],
      ["nädal", "nädalat"],
      ["päev", "päeva"],
      ["tund", "tundi"],
      ["minut", "minutit"],
      ["sekund", "sekundit"],
      ["millisekund", "millisekundit"],
      ","
    ),
    eu: language(
      "urte",
      "hilabete",
      "aste",
      "egun",
      "ordu",
      "minutu",
      "segundo",
      "milisegundo",
      ","
    ),
    fa: language(
      "سال",
      "ماه",
      "هفته",
      "روز",
      "ساعت",
      "دقیقه",
      "ثانیه",
      "میلی ثانیه"
    ),
    fi: onesLanguage(
      ["vuosi", "vuotta"],
      ["kuukausi", "kuukautta"],
      ["viikko", "viikkoa"],
      ["päivä", "päivää"],
      ["tunti", "tuntia"],
      ["minuutti", "minuuttia"],
      ["sekunti", "sekuntia"],
      ["millisekunti", "millisekuntia"],
      ","
    ),
    fo: onesLanguage(
      ["ár", "ár"],
      ["mánaður", "mánaðir"],
      ["vika", "vikur"],
      ["dagur", "dagar"],
      ["tími", "tímar"],
      ["minuttur", "minuttir"],
      ["sekund", "sekund"],
      ["millisekund", "millisekund"],
      ","
    ),
    fr: language(
      function (c) {
        return "an" + (c >= 2 ? "s" : "");
      },
      "mois",
      function (c) {
        return "semaine" + (c >= 2 ? "s" : "");
      },
      function (c) {
        return "jour" + (c >= 2 ? "s" : "");
      },
      function (c) {
        return "heure" + (c >= 2 ? "s" : "");
      },
      function (c) {
        return "minute" + (c >= 2 ? "s" : "");
      },
      function (c) {
        return "seconde" + (c >= 2 ? "s" : "");
      },
      function (c) {
        return "milliseconde" + (c >= 2 ? "s" : "");
      },
      ","
    ),
    gr: GREEK,
    he: onesLanguage(
      ["שנה", "שנים"],
      ["חודש", "חודשים"],
      ["שבוע", "שבועות"],
      ["יום", "ימים"],
      ["שעה", "שעות"],
      ["דקה", "דקות"],
      ["שניה", "שניות"],
      ["מילישנייה", "מילישניות"]
    ),
    hr: language(
      function (c) {
        if (c % 10 === 2 || c % 10 === 3 || c % 10 === 4) {
          return "godine";
        }
        return "godina";
      },
      function (c) {
        if (c === 1) {
          return "mjesec";
        } else if (c === 2 || c === 3 || c === 4) {
          return "mjeseca";
        }
        return "mjeseci";
      },
      function (c) {
        if (c % 10 === 1 && c !== 11) {
          return "tjedan";
        }
        return "tjedna";
      },
      onesUnit(["dan", "dana"]),
      function (c) {
        if (c === 1) {
          return "sat";
        } else if (c === 2 || c === 3 || c === 4) {
          return "sata";
        }
        return "sati";
      },
      function (c) {
        var mod10 = c % 10;
        if ((mod10 === 2 || mod10 === 3 || mod10 === 4) && (c < 10 || c > 14)) {
          return "minute";
        }
        return "minuta";
      },
      function (c) {
        var mod10 = c % 10;
        if (mod10 === 5 || (Math.floor(c) === c && c >= 10 && c <= 19)) {
          return "sekundi";
        } else if (mod10 === 1) {
          return "sekunda";
        } else if (mod10 === 2 || mod10 === 3 || mod10 === 4) {
          return "sekunde";
        }
        return "sekundi";
      },
      function (c) {
        if (c === 1) {
          return "milisekunda";
        } else if (c % 10 === 2 || c % 10 === 3 || c % 10 === 4) {
          return "milisekunde";
        }
        return "milisekundi";
      },
      ","
    ),
    hi: language(
      "साल",
      onesUnit(["महीना", "महीने"]),
      onesUnit(["हफ़्ता", "हफ्ते"]),
      "दिन",
      onesUnit(["घंटा", "घंटे"]),
      "मिनट",
      "सेकंड",
      "मिलीसेकंड"
    ),
    hu: language(
      "év",
      "hónap",
      "hét",
      "nap",
      "óra",
      "perc",
      "másodperc",
      "ezredmásodperc",
      ","
    ),
    id: language(
      "tahun",
      "bulan",
      "minggu",
      "hari",
      "jam",
      "menit",
      "detik",
      "milidetik"
    ),
    is: onesLanguage(
      ["ár", "ár"],
      ["mánuður", "mánuðir"],
      ["vika", "vikur"],
      ["dagur", "dagar"],
      ["klukkutími", "klukkutímar"],
      ["mínúta", "mínútur"],
      ["sekúnda", "sekúndur"],
      ["millisekúnda", "millisekúndur"]
    ),
    it: onesLanguage(
      ["anno", "anni"],
      ["mese", "mesi"],
      ["settimana", "settimane"],
      ["giorno", "giorni"],
      ["ora", "ore"],
      ["minuto", "minuti"],
      ["secondo", "secondi"],
      ["millisecondo", "millisecondi"],
      ","
    ),
    ja: language("年", "ヶ月", "週間", "日", "時間", "分", "秒", "ミリ秒"),
    km: language(
      "ឆ្នាំ",
      "ខែ",
      "សប្តាហ៍",
      "ថ្ងៃ",
      "ម៉ោង",
      "នាទី",
      "វិនាទី",
      "មិល្លីវិនាទី"
    ),
    kn: onesLanguage(
      ["ವರ್ಷ", "ವರ್ಷಗಳು"],
      ["ತಿಂಗಳು", "ತಿಂಗಳುಗಳು"],
      ["ವಾರ", "ವಾರಗಳು"],
      ["ದಿನ", "ದಿನಗಳು"],
      ["ಗಂಟೆ", "ಗಂಟೆಗಳು"],
      ["ನಿಮಿಷ", "ನಿಮಿಷಗಳು"],
      ["ಸೆಕೆಂಡ್", "ಸೆಕೆಂಡುಗಳು"],
      ["ಮಿಲಿಸೆಕೆಂಡ್", "ಮಿಲಿಸೆಕೆಂಡುಗಳು"]
    ),
    ko: language("년", "개월", "주일", "일", "시간", "분", "초", "밀리 초"),
    ku: language(
      "sal",
      "meh",
      "hefte",
      "roj",
      "seet",
      "deqe",
      "saniye",
      "mîlîçirk",
      ","
    ),
    lo: language(
      "ປີ",
      "ເດືອນ",
      "ອາທິດ",
      "ມື້",
      "ຊົ່ວໂມງ",
      "ນາທີ",
      "ວິນາທີ",
      "ມິນລິວິນາທີ",
      ","
    ),
    lt: language(
      function (c) {
        return c % 10 === 0 || (c % 100 >= 10 && c % 100 <= 20)
          ? "metų"
          : "metai";
      },
      function (c) {
        return ["mėnuo", "mėnesiai", "mėnesių"][getLithuanianForm(c)];
      },
      function (c) {
        return ["savaitė", "savaitės", "savaičių"][getLithuanianForm(c)];
      },
      function (c) {
        return ["diena", "dienos", "dienų"][getLithuanianForm(c)];
      },
      function (c) {
        return ["valanda", "valandos", "valandų"][getLithuanianForm(c)];
      },
      function (c) {
        return ["minutė", "minutės", "minučių"][getLithuanianForm(c)];
      },
      function (c) {
        return ["sekundė", "sekundės", "sekundžių"][getLithuanianForm(c)];
      },
      function (c) {
        return ["milisekundė", "milisekundės", "milisekundžių"][
          getLithuanianForm(c)
        ];
      },
      ","
    ),
    lv: language(
      function (c) {
        return getLatvianForm(c) ? "gads" : "gadi";
      },
      function (c) {
        return getLatvianForm(c) ? "mēnesis" : "mēneši";
      },
      function (c) {
        return getLatvianForm(c) ? "nedēļa" : "nedēļas";
      },
      function (c) {
        return getLatvianForm(c) ? "diena" : "dienas";
      },
      function (c) {
        return getLatvianForm(c) ? "stunda" : "stundas";
      },
      function (c) {
        return getLatvianForm(c) ? "minūte" : "minūtes";
      },
      function (c) {
        return getLatvianForm(c) ? "sekunde" : "sekundes";
      },
      function (c) {
        return getLatvianForm(c) ? "milisekunde" : "milisekundes";
      },
      ","
    ),
    mk: onesLanguage(
      ["година", "години"],
      ["месец", "месеци"],
      ["недела", "недели"],
      ["ден", "дена"],
      ["час", "часа"],
      ["минута", "минути"],
      ["секунда", "секунди"],
      ["милисекунда", "милисекунди"],
      ","
    ),
    mn: language(
      "жил",
      "сар",
      "долоо хоног",
      "өдөр",
      "цаг",
      "минут",
      "секунд",
      "миллисекунд"
    ),
    mr: language(
      onesUnit(["वर्ष", "वर्षे"]),
      onesUnit(["महिना", "महिने"]),
      onesUnit(["आठवडा", "आठवडे"]),
      "दिवस",
      "तास",
      onesUnit(["मिनिट", "मिनिटे"]),
      "सेकंद",
      "मिलिसेकंद"
    ),
    ms: language(
      "tahun",
      "bulan",
      "minggu",
      "hari",
      "jam",
      "minit",
      "saat",
      "milisaat"
    ),
    nl: onesLanguage(
      ["jaar", "jaar"],
      ["maand", "maanden"],
      ["week", "weken"],
      ["dag", "dagen"],
      ["uur", "uur"],
      ["minuut", "minuten"],
      ["seconde", "seconden"],
      ["milliseconde", "milliseconden"],
      ","
    ),
    no: onesLanguage(
      ["år", "år"],
      ["måned", "måneder"],
      ["uke", "uker"],
      ["dag", "dager"],
      ["time", "timer"],
      ["minutt", "minutter"],
      ["sekund", "sekunder"],
      ["millisekund", "millisekunder"],
      ","
    ),
    pl: language(
      function (c) {
        return ["rok", "roku", "lata", "lat"][getPolishForm(c)];
      },
      function (c) {
        return ["miesiąc", "miesiąca", "miesiące", "miesięcy"][
          getPolishForm(c)
        ];
      },
      function (c) {
        return ["tydzień", "tygodnia", "tygodnie", "tygodni"][getPolishForm(c)];
      },
      function (c) {
        return ["dzień", "dnia", "dni", "dni"][getPolishForm(c)];
      },
      function (c) {
        return ["godzina", "godziny", "godziny", "godzin"][getPolishForm(c)];
      },
      function (c) {
        return ["minuta", "minuty", "minuty", "minut"][getPolishForm(c)];
      },
      function (c) {
        return ["sekunda", "sekundy", "sekundy", "sekund"][getPolishForm(c)];
      },
      function (c) {
        return ["milisekunda", "milisekundy", "milisekundy", "milisekund"][
          getPolishForm(c)
        ];
      },
      ","
    ),
    pt: onesLanguage(
      ["ano", "anos"],
      ["mês", "meses"],
      ["semana", "semanas"],
      ["dia", "dias"],
      ["hora", "horas"],
      ["minuto", "minutos"],
      ["segundo", "segundos"],
      ["milissegundo", "milissegundos"],
      ","
    ),
    ro: language(
      romanianUnit("an", "ani", "de ani"),
      romanianUnit("lună", "luni", "de luni"),
      romanianUnit("săptămână", "săptămâni", "de săptămâni"),
      romanianUnit("zi", "zile", "de zile"),
      romanianUnit("oră", "ore", "de ore"),
      romanianUnit("minut", "minute", "de minute"),
      romanianUnit("secundă", "secunde", "de secunde"),
      romanianUnit("milisecundă", "milisecunde", "de milisecunde"),
      ","
    ),
    ru: slavicLanguage(
      ["лет", "год", "года"],
      ["месяцев", "месяц", "месяца"],
      ["недель", "неделя", "недели"],
      ["дней", "день", "дня"],
      ["часов", "час", "часа"],
      ["минут", "минута", "минуты"],
      ["секунд", "секунда", "секунды"],
      ["миллисекунд", "миллисекунда", "миллисекунды"]
    ),
    sq: language(
      onesUnit(["vit", "vjet"]),
      "muaj",
      "javë",
      "ditë",
      "orë",
      function (c) {
        return "minut" + (c === 1 ? "ë" : "a");
      },
      function (c) {
        return "sekond" + (c === 1 ? "ë" : "a");
      },
      function (c) {
        return "milisekond" + (c === 1 ? "ë" : "a");
      },
      ","
    ),
    sr: slavicLanguage(
      ["години", "година", "године"],
      ["месеци", "месец", "месеца"],
      ["недељи", "недеља", "недеље"],
      ["дани", "дан", "дана"],
      ["сати", "сат", "сата"],
      ["минута", "минут", "минута"],
      ["секунди", "секунда", "секунде"],
      ["милисекунди", "милисекунда", "милисекунде"]
    ),
    sr_Latn: slavicLanguage(
      ["godini", "godina", "godine"],
      ["meseci", "mesec", "meseca"],
      ["nedelji", "nedelja", "nedelje"],
      ["dani", "dan", "dana"],
      ["sati", "sat", "sata"],
      ["minuta", "minut", "minuta"],
      ["sekundi", "sekunda", "sekunde"],
      ["milisekundi", "milisekunda", "milisekunde"]
    ),
    ta: onesLanguage(
      ["வருடம்", "ஆண்டுகள்"],
      ["மாதம்", "மாதங்கள்"],
      ["வாரம்", "வாரங்கள்"],
      ["நாள்", "நாட்கள்"],
      ["மணி", "மணிநேரம்"],
      ["நிமிடம்", "நிமிடங்கள்"],
      ["வினாடி", "வினாடிகள்"],
      ["மில்லி விநாடி", "மில்லி விநாடிகள்"]
    ),
    te: onesLanguage(
      ["సంవత్సరం", "సంవత్సరాల"],
      ["నెల", "నెలల"],
      ["వారం", "వారాలు"],
      ["రోజు", "రోజులు"],
      ["గంట", "గంటలు"],
      ["నిమిషం", "నిమిషాలు"],
      ["సెకను", "సెకన్లు"],
      ["మిల్లీసెకన్", "మిల్లీసెకన్లు"]
    ),
    uk: slavicLanguage(
      ["років", "рік", "роки"],
      ["місяців", "місяць", "місяці"],
      ["тижнів", "тиждень", "тижні"],
      ["днів", "день", "дні"],
      ["годин", "година", "години"],
      ["хвилин", "хвилина", "хвилини"],
      ["секунд", "секунда", "секунди"],
      ["мілісекунд", "мілісекунда", "мілісекунди"]
    ),
    ur: language(
      "سال",
      onesUnit(["مہینہ", "مہینے"]),
      onesUnit(["ہفتہ", "ہفتے"]),
      "دن",
      onesUnit(["گھنٹہ", "گھنٹے"]),
      "منٹ",
      "سیکنڈ",
      "ملی سیکنڈ"
    ),
    sk: language(
      function (c) {
        return ["rok", "roky", "roky", "rokov"][getCzechOrSlovakForm(c)];
      },
      function (c) {
        return ["mesiac", "mesiace", "mesiace", "mesiacov"][
          getCzechOrSlovakForm(c)
        ];
      },
      function (c) {
        return ["týždeň", "týždne", "týždne", "týždňov"][
          getCzechOrSlovakForm(c)
        ];
      },
      function (c) {
        return ["deň", "dni", "dni", "dní"][getCzechOrSlovakForm(c)];
      },
      function (c) {
        return ["hodina", "hodiny", "hodiny", "hodín"][getCzechOrSlovakForm(c)];
      },
      function (c) {
        return ["minúta", "minúty", "minúty", "minút"][getCzechOrSlovakForm(c)];
      },
      function (c) {
        return ["sekunda", "sekundy", "sekundy", "sekúnd"][
          getCzechOrSlovakForm(c)
        ];
      },
      function (c) {
        return ["milisekunda", "milisekundy", "milisekundy", "milisekúnd"][
          getCzechOrSlovakForm(c)
        ];
      },
      ","
    ),
    sl: language(
      function (c) {
        if (c % 10 === 1) {
          return "leto";
        } else if (c % 100 === 2) {
          return "leti";
        } else if (
          c % 100 === 3 ||
          c % 100 === 4 ||
          (Math.floor(c) !== c && c % 100 <= 5)
        ) {
          return "leta";
        } else {
          return "let";
        }
      },
      function (c) {
        if (c % 10 === 1) {
          return "mesec";
        } else if (c % 100 === 2 || (Math.floor(c) !== c && c % 100 <= 5)) {
          return "meseca";
        } else if (c % 10 === 3 || c % 10 === 4) {
          return "mesece";
        } else {
          return "mesecev";
        }
      },
      function (c) {
        if (c % 10 === 1) {
          return "teden";
        } else if (c % 10 === 2 || (Math.floor(c) !== c && c % 100 <= 4)) {
          return "tedna";
        } else if (c % 10 === 3 || c % 10 === 4) {
          return "tedne";
        } else {
          return "tednov";
        }
      },
      function (c) {
        return c % 100 === 1 ? "dan" : "dni";
      },
      function (c) {
        if (c % 10 === 1) {
          return "ura";
        } else if (c % 100 === 2) {
          return "uri";
        } else if (c % 10 === 3 || c % 10 === 4 || Math.floor(c) !== c) {
          return "ure";
        } else {
          return "ur";
        }
      },
      function (c) {
        if (c % 10 === 1) {
          return "minuta";
        } else if (c % 10 === 2) {
          return "minuti";
        } else if (
          c % 10 === 3 ||
          c % 10 === 4 ||
          (Math.floor(c) !== c && c % 100 <= 4)
        ) {
          return "minute";
        } else {
          return "minut";
        }
      },
      function (c) {
        if (c % 10 === 1) {
          return "sekunda";
        } else if (c % 100 === 2) {
          return "sekundi";
        } else if (c % 100 === 3 || c % 100 === 4 || Math.floor(c) !== c) {
          return "sekunde";
        } else {
          return "sekund";
        }
      },
      function (c) {
        if (c % 10 === 1) {
          return "milisekunda";
        } else if (c % 100 === 2) {
          return "milisekundi";
        } else if (c % 100 === 3 || c % 100 === 4 || Math.floor(c) !== c) {
          return "milisekunde";
        } else {
          return "milisekund";
        }
      },
      ","
    ),
    sv: onesLanguage(
      ["år", "år"],
      ["månad", "månader"],
      ["vecka", "veckor"],
      ["dag", "dagar"],
      ["timme", "timmar"],
      ["minut", "minuter"],
      ["sekund", "sekunder"],
      ["millisekund", "millisekunder"],
      ","
    ),
    sw: assign(
      onesLanguage(
        ["mwaka", "miaka"],
        ["mwezi", "miezi"],
        ["wiki", "wiki"],
        ["siku", "masiku"],
        ["saa", "masaa"],
        ["dakika", "dakika"],
        ["sekunde", "sekunde"],
        ["milisekunde", "milisekunde"]
      ),
      { _numberFirst: true }
    ),
    tr: language(
      "yıl",
      "ay",
      "hafta",
      "gün",
      "saat",
      "dakika",
      "saniye",
      "milisaniye",
      ","
    ),
    th: language(
      "ปี",
      "เดือน",
      "สัปดาห์",
      "วัน",
      "ชั่วโมง",
      "นาที",
      "วินาที",
      "มิลลิวินาที"
    ),
    uz: language(
      "yil",
      "oy",
      "hafta",
      "kun",
      "soat",
      "minut",
      "sekund",
      "millisekund"
    ),
    uz_CYR: language(
      "йил",
      "ой",
      "ҳафта",
      "кун",
      "соат",
      "минут",
      "секунд",
      "миллисекунд"
    ),
    vi: language(
      "năm",
      "tháng",
      "tuần",
      "ngày",
      "giờ",
      "phút",
      "giây",
      "mili giây",
      ","
    ),
    zh_CN: language("年", "个月", "周", "天", "小时", "分钟", "秒", "毫秒"),
    zh_TW: language("年", "個月", "周", "天", "小時", "分鐘", "秒", "毫秒")
  };

  /**
   * Helper function for creating language definitions.
   *
   * @internal
   * @param {Unit} y
   * @param {Unit} mo
   * @param {Unit} w
   * @param {Unit} d
   * @param {Unit} h
   * @param {Unit} m
   * @param {Unit} s
   * @param {Unit} ms
   * @param {string} [decimal]
   * @returns {Language}
   */
  function language(y, mo, w, d, h, m, s, ms, decimal) {
    /** @type {Language} */
    var result = { y: y, mo: mo, w: w, d: d, h: h, m: m, s: s, ms: ms };
    if (decimal) {
      result.decimal = decimal;
    }
    return result;
  }

  /**
   * @internal
   * @param {[string, string]} unit
   * @returns {(c: number) => string}
   */
  function onesUnit(unit) {
    return function (c) {
      return c === 1 ? unit[0] : unit[1];
    };
  }

  /**
   * Helper for generating languages where the word varies if the count is 1.
   *
   * @internal
   * @param {[string, string]} y
   * @param {[string, string]} mo
   * @param {[string, string]} w
   * @param {[string, string]} d
   * @param {[string, string]} h
   * @param {[string, string]} m
   * @param {[string, string]} s
   * @param {[string, string]} ms
   * @param {string} [decimal]
   * @returns {Language}
   */
  function onesLanguage(y, mo, w, d, h, m, s, ms, decimal) {
    return language(
      onesUnit(y),
      onesUnit(mo),
      onesUnit(w),
      onesUnit(d),
      onesUnit(h),
      onesUnit(m),
      onesUnit(s),
      onesUnit(ms),
      decimal
    );
  }

  /**
   * Romanian uses "de" before the noun for numbers >= 20 (when not ending in 01-19).
   * See: https://en.wikipedia.org/wiki/Romanian_numbers#Preposition_de
   *
   * @internal
   * @param {string} single
   * @param {string} plural
   * @param {string} pluralWithDe
   * @returns {(c: number) => string}
   */
  function romanianUnit(single, plural, pluralWithDe) {
    return function (c) {
      if (c === 1) {
        return single;
      }
      if (Math.floor(c) !== c || c === 0) {
        return plural;
      }
      var remainder = c % 100;
      if (remainder >= 1 && remainder <= 19) {
        return plural;
      }
      return pluralWithDe;
    };
  }

  /**
   * @internal
   * @param {[string, string, string]} unit
   * @returns {(c: number) => string}
   */
  function slavicUnit(unit) {
    return function (c) {
      if (Math.floor(c) !== c) {
        return unit[2];
      }
      if (
        (c % 100 >= 5 && c % 100 <= 20) ||
        (c % 10 >= 5 && c % 10 <= 9) ||
        c % 10 === 0
      ) {
        return unit[0];
      }
      if (c % 10 === 1) {
        return unit[1];
      }
      if (c > 1) {
        return unit[2];
      }
      return unit[1];
    };
  }

  /**
   * Helper for generating Slavic languages.
   *
   * @internal
   * @param {[string, string, string]} y
   * @param {[string, string, string]} mo
   * @param {[string, string, string]} w
   * @param {[string, string, string]} d
   * @param {[string, string, string]} h
   * @param {[string, string, string]} m
   * @param {[string, string, string]} s
   * @param {[string, string, string]} ms
   * @returns {Language}
   */
  function slavicLanguage(y, mo, w, d, h, m, s, ms) {
    return language(
      slavicUnit(y),
      slavicUnit(mo),
      slavicUnit(w),
      slavicUnit(d),
      slavicUnit(h),
      slavicUnit(m),
      slavicUnit(s),
      slavicUnit(ms),
      ","
    );
  }

  /**
   * Helper function for Arabic.
   *
   * @internal
   * @param {number} c
   * @returns {0 | 1 | 2}
   */
  function getArabicForm(c) {
    if (c === 2) {
      return 1;
    }
    if (c > 2 && c < 11) {
      return 2;
    }
    return 0;
  }

  /**
   * Helper function for Polish.
   *
   * @internal
   * @param {number} c
   * @returns {0 | 1 | 2 | 3}
   */
  function getPolishForm(c) {
    if (c === 1) {
      return 0;
    }
    if (Math.floor(c) !== c) {
      return 1;
    }
    if (c % 10 >= 2 && c % 10 <= 4 && !(c % 100 > 10 && c % 100 < 20)) {
      return 2;
    }
    return 3;
  }

  /**
   * Helper function for Czech or Slovak.
   *
   * @internal
   * @param {number} c
   * @returns {0 | 1 | 2 | 3}
   */
  function getCzechOrSlovakForm(c) {
    if (c === 1) {
      return 0;
    }
    if (Math.floor(c) !== c) {
      return 1;
    }
    if (c % 10 >= 2 && c % 10 <= 4 && c % 100 < 10) {
      return 2;
    }
    return 3;
  }

  /**
   * Helper function for Lithuanian.
   *
   * @internal
   * @param {number} c
   * @returns {0 | 1 | 2}
   */
  function getLithuanianForm(c) {
    if (c === 1 || (c % 10 === 1 && c % 100 > 20)) {
      return 0;
    }
    if (
      Math.floor(c) !== c ||
      (c % 10 >= 2 && c % 100 > 20) ||
      (c % 10 >= 2 && c % 100 < 10)
    ) {
      return 1;
    }
    return 2;
  }

  /**
   * Helper function for Latvian.
   *
   * @internal
   * @param {number} c
   * @returns {boolean}
   */
  function getLatvianForm(c) {
    return c % 10 === 1 && c % 100 !== 11;
  }

  /**
   * @internal
   * @template T
   * @param {T} obj
   * @param {keyof T} key
   * @returns {boolean}
   */
  function has(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  /**
   * @internal
   * @param {Pick<Required<Options>, "language" | "fallbacks" | "languages">} options
   * @throws {Error} Throws an error if language is not found.
   * @returns {Language}
   */
  function getLanguage(options) {
    var possibleLanguages = [options.language];

    if (has(options, "fallbacks")) {
      if (isArray(options.fallbacks) && options.fallbacks.length) {
        possibleLanguages = possibleLanguages.concat(options.fallbacks);
      } else {
        throw new Error("fallbacks must be an array with at least one element");
      }
    }

    for (var i = 0; i < possibleLanguages.length; i++) {
      var languageToTry = possibleLanguages[i];
      if (has(options.languages, languageToTry)) {
        return options.languages[languageToTry];
      }
      if (has(LANGUAGES, languageToTry)) {
        return LANGUAGES[languageToTry];
      }
    }

    throw new Error("No language found.");
  }

  /**
   * @internal
   * @param {Piece} piece
   * @param {Language} language
   * @param {Pick<Required<Options>, "decimal" | "spacer" | "maxDecimalPoints" | "digitReplacements">} options
   */
  function renderPiece(piece, language, options) {
    var unitName = piece.unitName;
    var unitCount = piece.unitCount;

    var spacer = options.spacer;
    var maxDecimalPoints = options.maxDecimalPoints;

    /** @type {string} */
    var decimal;
    if (has(options, "decimal")) {
      decimal = options.decimal;
    } else if (has(language, "decimal")) {
      decimal = language.decimal;
    } else {
      decimal = ".";
    }

    /** @type {undefined | DigitReplacements} */
    var digitReplacements;
    if ("digitReplacements" in options) {
      digitReplacements = options.digitReplacements;
    } else if ("_digitReplacements" in language) {
      digitReplacements = language._digitReplacements;
    }

    /** @type {string} */
    var formattedCount;
    var normalizedUnitCount =
      maxDecimalPoints === void 0
        ? unitCount
        : Math.floor(unitCount * Math.pow(10, maxDecimalPoints)) /
          Math.pow(10, maxDecimalPoints);
    var countStr = normalizedUnitCount.toString();

    if (language._hideCountIf2 && unitCount === 2) {
      formattedCount = "";
      spacer = "";
    } else {
      if (digitReplacements) {
        formattedCount = "";
        for (var i = 0; i < countStr.length; i++) {
          var character = countStr[i];
          if (character === ".") {
            formattedCount += decimal;
          } else {
            formattedCount +=
              digitReplacements[
                /** @type {"0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"} */ (
                  character
                )
              ];
          }
        }
      } else {
        formattedCount = countStr.replace(".", decimal);
      }
    }

    var languageWord = language[unitName];
    var word;
    if (typeof languageWord === "function") {
      word = languageWord(unitCount);
    } else {
      word = languageWord;
    }

    if (language._numberFirst) {
      return word + spacer + formattedCount;
    }
    return formattedCount + spacer + word;
  }

  /**
   * @internal
   * @typedef {Object} Piece
   * @prop {UnitName} unitName
   * @prop {number} unitCount
   */

  /**
   * @internal
   * @param {number} ms
   * @param {Pick<Required<Options>, "units" | "unitMeasures" | "largest" | "round">} options
   * @returns {Piece[]}
   */
  function getPieces(ms, options) {
    /** @type {UnitName} */
    var unitName;

    /** @type {number} */
    var i;

    /** @type {number} */
    var unitCount;

    /** @type {number} */
    var msRemaining;

    var units = options.units;
    var unitMeasures = options.unitMeasures;
    var largest = "largest" in options ? options.largest : Infinity;

    if (!units.length) return [];

    // Get the counts for each unit. Doesn't round or truncate anything.
    // For example, might create an object like `{ y: 7, m: 6, w: 0, d: 5, h: 23.99 }`.
    /** @type {Partial<Record<UnitName, number>>} */
    var unitCounts = {};
    msRemaining = ms;
    for (i = 0; i < units.length; i++) {
      unitName = units[i];
      var unitMs = unitMeasures[unitName];

      var isLast = i === units.length - 1;
      unitCount = isLast
        ? msRemaining / unitMs
        : Math.floor(msRemaining / unitMs);
      unitCounts[unitName] = unitCount;

      msRemaining -= unitCount * unitMs;
    }

    if (options.round) {
      // Update counts based on the `largest` option.
      // For example, if `largest === 2` and `unitCount` is `{ y: 7, m: 6, w: 0, d: 5, h: 23.99 }`,
      // updates to something like `{ y: 7, m: 6.2 }`.
      var unitsRemainingBeforeRound = largest;
      for (i = 0; i < units.length; i++) {
        unitName = units[i];
        unitCount = unitCounts[unitName];

        if (unitCount === 0) continue;

        unitsRemainingBeforeRound--;

        // "Take" the rest of the units into this one.
        if (unitsRemainingBeforeRound === 0) {
          for (var j = i + 1; j < units.length; j++) {
            var smallerUnitName = units[j];
            var smallerUnitCount = unitCounts[smallerUnitName];
            unitCounts[unitName] +=
              (smallerUnitCount * unitMeasures[smallerUnitName]) /
              unitMeasures[unitName];
            unitCounts[smallerUnitName] = 0;
          }
          break;
        }
      }

      // Round the last piece (which should be the only non-integer).
      //
      // This can be a little tricky if the last piece "bubbles up" to a larger
      // unit. For example, "3 days, 23.99 hours" should be rounded to "4 days".
      // It can also require multiple passes. For example, "6 days, 23.99 hours"
      // should become "1 week".
      for (i = units.length - 1; i >= 0; i--) {
        unitName = units[i];
        unitCount = unitCounts[unitName];

        if (unitCount === 0) continue;

        var rounded = Math.round(unitCount);
        unitCounts[unitName] = rounded;

        if (i === 0) break;

        var previousUnitName = units[i - 1];
        var previousUnitMs = unitMeasures[previousUnitName];
        var amountOfPreviousUnit = Math.floor(
          (rounded * unitMeasures[unitName]) / previousUnitMs
        );
        if (amountOfPreviousUnit) {
          unitCounts[previousUnitName] += amountOfPreviousUnit;
          unitCounts[unitName] = 0;
        } else {
          break;
        }
      }
    }

    /** @type {Piece[]} */
    var result = [];
    for (i = 0; i < units.length && result.length < largest; i++) {
      unitName = units[i];
      unitCount = unitCounts[unitName];
      if (unitCount) {
        result.push({ unitName: unitName, unitCount: unitCount });
      }
    }
    return result;
  }

  /**
   * @internal
   * @param {Piece[]} pieces
   * @param {Pick<Required<Options>, "units" | "language" | "languages" | "fallbacks" | "delimiter" | "spacer" | "decimal" | "conjunction" | "maxDecimalPoints" | "serialComma" | "digitReplacements">} options
   * @returns {string}
   */
  function formatPieces(pieces, options) {
    var language = getLanguage(options);

    if (!pieces.length) {
      var units = options.units;
      var smallestUnitName = units[units.length - 1];
      return renderPiece(
        { unitName: smallestUnitName, unitCount: 0 },
        language,
        options
      );
    }

    var conjunction = options.conjunction;
    var serialComma = options.serialComma;

    var delimiter;
    if (has(options, "delimiter")) {
      delimiter = options.delimiter;
    } else if (has(language, "delimiter")) {
      delimiter = language.delimiter;
    } else {
      delimiter = ", ";
    }

    /** @type {string[]} */
    var renderedPieces = [];
    for (var i = 0; i < pieces.length; i++) {
      renderedPieces.push(renderPiece(pieces[i], language, options));
    }

    if (!conjunction || pieces.length === 1) {
      return renderedPieces.join(delimiter);
    }

    if (pieces.length === 2) {
      return renderedPieces.join(conjunction);
    }

    return (
      renderedPieces.slice(0, -1).join(delimiter) +
      (serialComma ? "," : "") +
      conjunction +
      renderedPieces.slice(-1)
    );
  }

  /**
   * Create a humanizer, which lets you change the default options.
   *
   * @param {Options} [passedOptions] Options to customize the humanizer
   * @returns {(ms: number, humanizerOptions: Options) => string} A function that humanizes durations
   */
  function humanizer(passedOptions) {
    /**
     * @param {number} ms
     * @param {Options} [humanizerOptions]
     * @returns {string}
     */
    var result = function humanizer(ms, humanizerOptions) {
      // Make sure we have a positive number.
      //
      // Has the nice side-effect of converting things to numbers. For example,
      // converts `"123"` and `Number(123)` to `123`.
      ms = Math.abs(ms);

      var options = assign({}, result, humanizerOptions || {});

      var pieces = getPieces(ms, options);

      return formatPieces(pieces, options);
    };

    return assign(
      result,
      {
        language: "en",
        spacer: " ",
        conjunction: "",
        serialComma: true,
        units: ["y", "mo", "w", "d", "h", "m", "s"],
        languages: {},
        round: false,
        unitMeasures: {
          y: 31557600000,
          mo: 2629800000,
          w: 604800000,
          d: 86400000,
          h: 3600000,
          m: 60000,
          s: 1000,
          ms: 1
        }
      },
      passedOptions
    );
  }

  /**
   * Humanize a duration.
   *
   * This is a wrapper around the default humanizer.
   */
  var humanizeDuration = assign(humanizer({}), {
    /**
     * Get a list of supported languages.
     *
     * @returns {string[]} An array of language codes
     */
    getSupportedLanguages: function getSupportedLanguages() {
      var result = [];
      for (var language in LANGUAGES) {
        if (has(LANGUAGES, language) && language !== "gr") {
          result.push(language);
        }
      }
      return result;
    },
    humanizer: humanizer
  });

  // @ts-ignore
  if (typeof define === "function" && define.amd) {
    // @ts-ignore
    define(function () {
      return humanizeDuration;
    });
  } else if (typeof module !== "undefined" && module.exports) {
    module.exports = humanizeDuration;
  } else {
    this.humanizeDuration = humanizeDuration;
  }
})();
