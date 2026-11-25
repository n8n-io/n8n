import { a as __toCommonJS, n as __esmMin, o as __toESM, r as __exportAll, t as __commonJSMin } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, $f as NOOP, $l as ElTable, Bd as createBlock, Cp as toHandlerKey, Dd as runtime_dom_esm_bundler_exports, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Of as withDirectives, Qf as NO, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, Zf as EMPTY_OBJ, _f as resolveDirective, _p as normalizeClass, ap as isArray, bp as parseStringStyle, cp as isMathMLTag, dp as isReservedProp, ep as camelize, eu as ElTableColumn, ff as openBlock, fp as isSVGTag, gp as makeMap, hp as isVoidTag, ip as init_shared_esm_bundler, lf as onMounted, lp as isObject, mp as isSymbol, np as extend, op as isBuiltInDirective, pp as isString, rp as generateCodeFrame, sp as isHTMLTag, tp as capitalize, up as isOn, xp as shared_esm_bundler_exports, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { AM as createFormEventBus, FA as capitalizeFirstLetter, Kd as useDocumentTitle, PA as useMessage, Ru as usePageRedirectionHelper, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, dC as useToast, dx as MODAL_CONFIRM, fC as VIEWS, jN as useI18n, lM as N8nFormInputs_default, ot as useSSOStore, tM as N8nInfoTip_default, uy as convertToDisplayDate, xM as N8nEmptyState_default, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
//#region ../../../node_modules/.pnpm/humanize-duration@3.27.3/node_modules/humanize-duration/humanize-duration.js
var require_humanize_duration = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	(function() {
		var greek = {
			y: function(c) {
				return c === 1 ? "χρόνος" : "χρόνια";
			},
			mo: function(c) {
				return c === 1 ? "μήνας" : "μήνες";
			},
			w: function(c) {
				return c === 1 ? "εβδομάδα" : "εβδομάδες";
			},
			d: function(c) {
				return c === 1 ? "μέρα" : "μέρες";
			},
			h: function(c) {
				return c === 1 ? "ώρα" : "ώρες";
			},
			m: function(c) {
				return c === 1 ? "λεπτό" : "λεπτά";
			},
			s: function(c) {
				return c === 1 ? "δευτερόλεπτο" : "δευτερόλεπτα";
			},
			ms: function(c) {
				return (c === 1 ? "χιλιοστό" : "χιλιοστά") + " του δευτερολέπτου";
			},
			decimal: ","
		};
		var ARABIC_DIGITS = [
			"۰",
			"١",
			"٢",
			"٣",
			"٤",
			"٥",
			"٦",
			"٧",
			"٨",
			"٩"
		];
		var LANGUAGES = {
			af: {
				y: "jaar",
				mo: function(c) {
					return "maand" + (c === 1 ? "" : "e");
				},
				w: function(c) {
					return c === 1 ? "week" : "weke";
				},
				d: function(c) {
					return c === 1 ? "dag" : "dae";
				},
				h: function(c) {
					return c === 1 ? "uur" : "ure";
				},
				m: function(c) {
					return c === 1 ? "minuut" : "minute";
				},
				s: function(c) {
					return "sekonde" + (c === 1 ? "" : "s");
				},
				ms: function(c) {
					return "millisekonde" + (c === 1 ? "" : "s");
				},
				decimal: ","
			},
			ar: {
				y: function(c) {
					return [
						"سنة",
						"سنتان",
						"سنوات"
					][getArabicForm(c)];
				},
				mo: function(c) {
					return [
						"شهر",
						"شهران",
						"أشهر"
					][getArabicForm(c)];
				},
				w: function(c) {
					return [
						"أسبوع",
						"أسبوعين",
						"أسابيع"
					][getArabicForm(c)];
				},
				d: function(c) {
					return [
						"يوم",
						"يومين",
						"أيام"
					][getArabicForm(c)];
				},
				h: function(c) {
					return [
						"ساعة",
						"ساعتين",
						"ساعات"
					][getArabicForm(c)];
				},
				m: function(c) {
					return [
						"دقيقة",
						"دقيقتان",
						"دقائق"
					][getArabicForm(c)];
				},
				s: function(c) {
					return [
						"ثانية",
						"ثانيتان",
						"ثواني"
					][getArabicForm(c)];
				},
				ms: function(c) {
					return [
						"جزء من الثانية",
						"جزآن من الثانية",
						"أجزاء من الثانية"
					][getArabicForm(c)];
				},
				decimal: ",",
				delimiter: " و ",
				_formatCount: function(count, decimal) {
					var replacements = assign(ARABIC_DIGITS, { ".": decimal });
					var characters = count.toString().split("");
					for (var i = 0; i < characters.length; i++) {
						var character = characters[i];
						if (has(replacements, character)) characters[i] = replacements[character];
					}
					return characters.join("");
				}
			},
			bg: {
				y: function(c) {
					return [
						"години",
						"година",
						"години"
					][getSlavicForm(c)];
				},
				mo: function(c) {
					return [
						"месеца",
						"месец",
						"месеца"
					][getSlavicForm(c)];
				},
				w: function(c) {
					return [
						"седмици",
						"седмица",
						"седмици"
					][getSlavicForm(c)];
				},
				d: function(c) {
					return [
						"дни",
						"ден",
						"дни"
					][getSlavicForm(c)];
				},
				h: function(c) {
					return [
						"часа",
						"час",
						"часа"
					][getSlavicForm(c)];
				},
				m: function(c) {
					return [
						"минути",
						"минута",
						"минути"
					][getSlavicForm(c)];
				},
				s: function(c) {
					return [
						"секунди",
						"секунда",
						"секунди"
					][getSlavicForm(c)];
				},
				ms: function(c) {
					return [
						"милисекунди",
						"милисекунда",
						"милисекунди"
					][getSlavicForm(c)];
				},
				decimal: ","
			},
			bn: {
				y: "বছর",
				mo: "মাস",
				w: "সপ্তাহ",
				d: "দিন",
				h: "ঘন্টা",
				m: "মিনিট",
				s: "সেকেন্ড",
				ms: "মিলিসেকেন্ড"
			},
			ca: {
				y: function(c) {
					return "any" + (c === 1 ? "" : "s");
				},
				mo: function(c) {
					return "mes" + (c === 1 ? "" : "os");
				},
				w: function(c) {
					return "setman" + (c === 1 ? "a" : "es");
				},
				d: function(c) {
					return "di" + (c === 1 ? "a" : "es");
				},
				h: function(c) {
					return "hor" + (c === 1 ? "a" : "es");
				},
				m: function(c) {
					return "minut" + (c === 1 ? "" : "s");
				},
				s: function(c) {
					return "segon" + (c === 1 ? "" : "s");
				},
				ms: function(c) {
					return "milisegon" + (c === 1 ? "" : "s");
				},
				decimal: ","
			},
			cs: {
				y: function(c) {
					return [
						"rok",
						"roku",
						"roky",
						"let"
					][getCzechOrSlovakForm(c)];
				},
				mo: function(c) {
					return [
						"měsíc",
						"měsíce",
						"měsíce",
						"měsíců"
					][getCzechOrSlovakForm(c)];
				},
				w: function(c) {
					return [
						"týden",
						"týdne",
						"týdny",
						"týdnů"
					][getCzechOrSlovakForm(c)];
				},
				d: function(c) {
					return [
						"den",
						"dne",
						"dny",
						"dní"
					][getCzechOrSlovakForm(c)];
				},
				h: function(c) {
					return [
						"hodina",
						"hodiny",
						"hodiny",
						"hodin"
					][getCzechOrSlovakForm(c)];
				},
				m: function(c) {
					return [
						"minuta",
						"minuty",
						"minuty",
						"minut"
					][getCzechOrSlovakForm(c)];
				},
				s: function(c) {
					return [
						"sekunda",
						"sekundy",
						"sekundy",
						"sekund"
					][getCzechOrSlovakForm(c)];
				},
				ms: function(c) {
					return [
						"milisekunda",
						"milisekundy",
						"milisekundy",
						"milisekund"
					][getCzechOrSlovakForm(c)];
				},
				decimal: ","
			},
			cy: {
				y: "flwyddyn",
				mo: "mis",
				w: "wythnos",
				d: "diwrnod",
				h: "awr",
				m: "munud",
				s: "eiliad",
				ms: "milieiliad"
			},
			da: {
				y: "år",
				mo: function(c) {
					return "måned" + (c === 1 ? "" : "er");
				},
				w: function(c) {
					return "uge" + (c === 1 ? "" : "r");
				},
				d: function(c) {
					return "dag" + (c === 1 ? "" : "e");
				},
				h: function(c) {
					return "time" + (c === 1 ? "" : "r");
				},
				m: function(c) {
					return "minut" + (c === 1 ? "" : "ter");
				},
				s: function(c) {
					return "sekund" + (c === 1 ? "" : "er");
				},
				ms: function(c) {
					return "millisekund" + (c === 1 ? "" : "er");
				},
				decimal: ","
			},
			de: {
				y: function(c) {
					return "Jahr" + (c === 1 ? "" : "e");
				},
				mo: function(c) {
					return "Monat" + (c === 1 ? "" : "e");
				},
				w: function(c) {
					return "Woche" + (c === 1 ? "" : "n");
				},
				d: function(c) {
					return "Tag" + (c === 1 ? "" : "e");
				},
				h: function(c) {
					return "Stunde" + (c === 1 ? "" : "n");
				},
				m: function(c) {
					return "Minute" + (c === 1 ? "" : "n");
				},
				s: function(c) {
					return "Sekunde" + (c === 1 ? "" : "n");
				},
				ms: function(c) {
					return "Millisekunde" + (c === 1 ? "" : "n");
				},
				decimal: ","
			},
			el: greek,
			en: {
				y: function(c) {
					return "year" + (c === 1 ? "" : "s");
				},
				mo: function(c) {
					return "month" + (c === 1 ? "" : "s");
				},
				w: function(c) {
					return "week" + (c === 1 ? "" : "s");
				},
				d: function(c) {
					return "day" + (c === 1 ? "" : "s");
				},
				h: function(c) {
					return "hour" + (c === 1 ? "" : "s");
				},
				m: function(c) {
					return "minute" + (c === 1 ? "" : "s");
				},
				s: function(c) {
					return "second" + (c === 1 ? "" : "s");
				},
				ms: function(c) {
					return "millisecond" + (c === 1 ? "" : "s");
				},
				decimal: "."
			},
			eo: {
				y: function(c) {
					return "jaro" + (c === 1 ? "" : "j");
				},
				mo: function(c) {
					return "monato" + (c === 1 ? "" : "j");
				},
				w: function(c) {
					return "semajno" + (c === 1 ? "" : "j");
				},
				d: function(c) {
					return "tago" + (c === 1 ? "" : "j");
				},
				h: function(c) {
					return "horo" + (c === 1 ? "" : "j");
				},
				m: function(c) {
					return "minuto" + (c === 1 ? "" : "j");
				},
				s: function(c) {
					return "sekundo" + (c === 1 ? "" : "j");
				},
				ms: function(c) {
					return "milisekundo" + (c === 1 ? "" : "j");
				},
				decimal: ","
			},
			es: {
				y: function(c) {
					return "año" + (c === 1 ? "" : "s");
				},
				mo: function(c) {
					return "mes" + (c === 1 ? "" : "es");
				},
				w: function(c) {
					return "semana" + (c === 1 ? "" : "s");
				},
				d: function(c) {
					return "día" + (c === 1 ? "" : "s");
				},
				h: function(c) {
					return "hora" + (c === 1 ? "" : "s");
				},
				m: function(c) {
					return "minuto" + (c === 1 ? "" : "s");
				},
				s: function(c) {
					return "segundo" + (c === 1 ? "" : "s");
				},
				ms: function(c) {
					return "milisegundo" + (c === 1 ? "" : "s");
				},
				decimal: ","
			},
			et: {
				y: function(c) {
					return "aasta" + (c === 1 ? "" : "t");
				},
				mo: function(c) {
					return "kuu" + (c === 1 ? "" : "d");
				},
				w: function(c) {
					return "nädal" + (c === 1 ? "" : "at");
				},
				d: function(c) {
					return "päev" + (c === 1 ? "" : "a");
				},
				h: function(c) {
					return "tund" + (c === 1 ? "" : "i");
				},
				m: function(c) {
					return "minut" + (c === 1 ? "" : "it");
				},
				s: function(c) {
					return "sekund" + (c === 1 ? "" : "it");
				},
				ms: function(c) {
					return "millisekund" + (c === 1 ? "" : "it");
				},
				decimal: ","
			},
			eu: {
				y: "urte",
				mo: "hilabete",
				w: "aste",
				d: "egun",
				h: "ordu",
				m: "minutu",
				s: "segundo",
				ms: "milisegundo",
				decimal: ","
			},
			fa: {
				y: "سال",
				mo: "ماه",
				w: "هفته",
				d: "روز",
				h: "ساعت",
				m: "دقیقه",
				s: "ثانیه",
				ms: "میلی ثانیه",
				decimal: "."
			},
			fi: {
				y: function(c) {
					return c === 1 ? "vuosi" : "vuotta";
				},
				mo: function(c) {
					return c === 1 ? "kuukausi" : "kuukautta";
				},
				w: function(c) {
					return "viikko" + (c === 1 ? "" : "a");
				},
				d: function(c) {
					return "päivä" + (c === 1 ? "" : "ä");
				},
				h: function(c) {
					return "tunti" + (c === 1 ? "" : "a");
				},
				m: function(c) {
					return "minuutti" + (c === 1 ? "" : "a");
				},
				s: function(c) {
					return "sekunti" + (c === 1 ? "" : "a");
				},
				ms: function(c) {
					return "millisekunti" + (c === 1 ? "" : "a");
				},
				decimal: ","
			},
			fo: {
				y: "ár",
				mo: function(c) {
					return c === 1 ? "mánaður" : "mánaðir";
				},
				w: function(c) {
					return c === 1 ? "vika" : "vikur";
				},
				d: function(c) {
					return c === 1 ? "dagur" : "dagar";
				},
				h: function(c) {
					return c === 1 ? "tími" : "tímar";
				},
				m: function(c) {
					return c === 1 ? "minuttur" : "minuttir";
				},
				s: "sekund",
				ms: "millisekund",
				decimal: ","
			},
			fr: {
				y: function(c) {
					return "an" + (c >= 2 ? "s" : "");
				},
				mo: "mois",
				w: function(c) {
					return "semaine" + (c >= 2 ? "s" : "");
				},
				d: function(c) {
					return "jour" + (c >= 2 ? "s" : "");
				},
				h: function(c) {
					return "heure" + (c >= 2 ? "s" : "");
				},
				m: function(c) {
					return "minute" + (c >= 2 ? "s" : "");
				},
				s: function(c) {
					return "seconde" + (c >= 2 ? "s" : "");
				},
				ms: function(c) {
					return "milliseconde" + (c >= 2 ? "s" : "");
				},
				decimal: ","
			},
			gr: greek,
			he: {
				y: function(c) {
					return c === 1 ? "שנה" : "שנים";
				},
				mo: function(c) {
					return c === 1 ? "חודש" : "חודשים";
				},
				w: function(c) {
					return c === 1 ? "שבוע" : "שבועות";
				},
				d: function(c) {
					return c === 1 ? "יום" : "ימים";
				},
				h: function(c) {
					return c === 1 ? "שעה" : "שעות";
				},
				m: function(c) {
					return c === 1 ? "דקה" : "דקות";
				},
				s: function(c) {
					return c === 1 ? "שניה" : "שניות";
				},
				ms: function(c) {
					return c === 1 ? "מילישנייה" : "מילישניות";
				},
				decimal: "."
			},
			hr: {
				y: function(c) {
					if (c % 10 === 2 || c % 10 === 3 || c % 10 === 4) return "godine";
					return "godina";
				},
				mo: function(c) {
					if (c === 1) return "mjesec";
					else if (c === 2 || c === 3 || c === 4) return "mjeseca";
					return "mjeseci";
				},
				w: function(c) {
					if (c % 10 === 1 && c !== 11) return "tjedan";
					return "tjedna";
				},
				d: function(c) {
					return c === 1 ? "dan" : "dana";
				},
				h: function(c) {
					if (c === 1) return "sat";
					else if (c === 2 || c === 3 || c === 4) return "sata";
					return "sati";
				},
				m: function(c) {
					var mod10 = c % 10;
					if ((mod10 === 2 || mod10 === 3 || mod10 === 4) && (c < 10 || c > 14)) return "minute";
					return "minuta";
				},
				s: function(c) {
					var mod10 = c % 10;
					if (mod10 === 5 || Math.floor(c) === c && c >= 10 && c <= 19) return "sekundi";
					else if (mod10 === 1) return "sekunda";
					else if (mod10 === 2 || mod10 === 3 || mod10 === 4) return "sekunde";
					return "sekundi";
				},
				ms: function(c) {
					if (c === 1) return "milisekunda";
					else if (c % 10 === 2 || c % 10 === 3 || c % 10 === 4) return "milisekunde";
					return "milisekundi";
				},
				decimal: ","
			},
			hi: {
				y: "साल",
				mo: function(c) {
					return c === 1 ? "महीना" : "महीने";
				},
				w: function(c) {
					return c === 1 ? "हफ़्ता" : "हफ्ते";
				},
				d: "दिन",
				h: function(c) {
					return c === 1 ? "घंटा" : "घंटे";
				},
				m: "मिनट",
				s: "सेकंड",
				ms: "मिलीसेकंड",
				decimal: "."
			},
			hu: {
				y: "év",
				mo: "hónap",
				w: "hét",
				d: "nap",
				h: "óra",
				m: "perc",
				s: "másodperc",
				ms: "ezredmásodperc",
				decimal: ","
			},
			id: {
				y: "tahun",
				mo: "bulan",
				w: "minggu",
				d: "hari",
				h: "jam",
				m: "menit",
				s: "detik",
				ms: "milidetik",
				decimal: "."
			},
			is: {
				y: "ár",
				mo: function(c) {
					return "mánuð" + (c === 1 ? "ur" : "ir");
				},
				w: function(c) {
					return "vik" + (c === 1 ? "a" : "ur");
				},
				d: function(c) {
					return "dag" + (c === 1 ? "ur" : "ar");
				},
				h: function(c) {
					return "klukkutím" + (c === 1 ? "i" : "ar");
				},
				m: function(c) {
					return "mínút" + (c === 1 ? "a" : "ur");
				},
				s: function(c) {
					return "sekúnd" + (c === 1 ? "a" : "ur");
				},
				ms: function(c) {
					return "millisekúnd" + (c === 1 ? "a" : "ur");
				},
				decimal: "."
			},
			it: {
				y: function(c) {
					return "ann" + (c === 1 ? "o" : "i");
				},
				mo: function(c) {
					return "mes" + (c === 1 ? "e" : "i");
				},
				w: function(c) {
					return "settiman" + (c === 1 ? "a" : "e");
				},
				d: function(c) {
					return "giorn" + (c === 1 ? "o" : "i");
				},
				h: function(c) {
					return "or" + (c === 1 ? "a" : "e");
				},
				m: function(c) {
					return "minut" + (c === 1 ? "o" : "i");
				},
				s: function(c) {
					return "second" + (c === 1 ? "o" : "i");
				},
				ms: function(c) {
					return "millisecond" + (c === 1 ? "o" : "i");
				},
				decimal: ","
			},
			ja: {
				y: "年",
				mo: "ヶ月",
				w: "週",
				d: "日",
				h: "時間",
				m: "分",
				s: "秒",
				ms: "ミリ秒",
				decimal: "."
			},
			km: {
				y: "ឆ្នាំ",
				mo: "ខែ",
				w: "សប្តាហ៍",
				d: "ថ្ងៃ",
				h: "ម៉ោង",
				m: "នាទី",
				s: "វិនាទី",
				ms: "មិល្លីវិនាទី"
			},
			kn: {
				y: function(c) {
					return c === 1 ? "ವರ್ಷ" : "ವರ್ಷಗಳು";
				},
				mo: function(c) {
					return c === 1 ? "ತಿಂಗಳು" : "ತಿಂಗಳುಗಳು";
				},
				w: function(c) {
					return c === 1 ? "ವಾರ" : "ವಾರಗಳು";
				},
				d: function(c) {
					return c === 1 ? "ದಿನ" : "ದಿನಗಳು";
				},
				h: function(c) {
					return c === 1 ? "ಗಂಟೆ" : "ಗಂಟೆಗಳು";
				},
				m: function(c) {
					return c === 1 ? "ನಿಮಿಷ" : "ನಿಮಿಷಗಳು";
				},
				s: function(c) {
					return c === 1 ? "ಸೆಕೆಂಡ್" : "ಸೆಕೆಂಡುಗಳು";
				},
				ms: function(c) {
					return c === 1 ? "ಮಿಲಿಸೆಕೆಂಡ್" : "ಮಿಲಿಸೆಕೆಂಡುಗಳು";
				}
			},
			ko: {
				y: "년",
				mo: "개월",
				w: "주일",
				d: "일",
				h: "시간",
				m: "분",
				s: "초",
				ms: "밀리 초",
				decimal: "."
			},
			ku: {
				y: "sal",
				mo: "meh",
				w: "hefte",
				d: "roj",
				h: "seet",
				m: "deqe",
				s: "saniye",
				ms: "mîlîçirk",
				decimal: ","
			},
			lo: {
				y: "ປີ",
				mo: "ເດືອນ",
				w: "ອາທິດ",
				d: "ມື້",
				h: "ຊົ່ວໂມງ",
				m: "ນາທີ",
				s: "ວິນາທີ",
				ms: "ມິນລິວິນາທີ",
				decimal: ","
			},
			lt: {
				y: function(c) {
					return c % 10 === 0 || c % 100 >= 10 && c % 100 <= 20 ? "metų" : "metai";
				},
				mo: function(c) {
					return [
						"mėnuo",
						"mėnesiai",
						"mėnesių"
					][getLithuanianForm(c)];
				},
				w: function(c) {
					return [
						"savaitė",
						"savaitės",
						"savaičių"
					][getLithuanianForm(c)];
				},
				d: function(c) {
					return [
						"diena",
						"dienos",
						"dienų"
					][getLithuanianForm(c)];
				},
				h: function(c) {
					return [
						"valanda",
						"valandos",
						"valandų"
					][getLithuanianForm(c)];
				},
				m: function(c) {
					return [
						"minutė",
						"minutės",
						"minučių"
					][getLithuanianForm(c)];
				},
				s: function(c) {
					return [
						"sekundė",
						"sekundės",
						"sekundžių"
					][getLithuanianForm(c)];
				},
				ms: function(c) {
					return [
						"milisekundė",
						"milisekundės",
						"milisekundžių"
					][getLithuanianForm(c)];
				},
				decimal: ","
			},
			lv: {
				y: function(c) {
					return getLatvianForm(c) ? "gads" : "gadi";
				},
				mo: function(c) {
					return getLatvianForm(c) ? "mēnesis" : "mēneši";
				},
				w: function(c) {
					return getLatvianForm(c) ? "nedēļa" : "nedēļas";
				},
				d: function(c) {
					return getLatvianForm(c) ? "diena" : "dienas";
				},
				h: function(c) {
					return getLatvianForm(c) ? "stunda" : "stundas";
				},
				m: function(c) {
					return getLatvianForm(c) ? "minūte" : "minūtes";
				},
				s: function(c) {
					return getLatvianForm(c) ? "sekunde" : "sekundes";
				},
				ms: function(c) {
					return getLatvianForm(c) ? "milisekunde" : "milisekundes";
				},
				decimal: ","
			},
			mk: {
				y: function(c) {
					return c === 1 ? "година" : "години";
				},
				mo: function(c) {
					return c === 1 ? "месец" : "месеци";
				},
				w: function(c) {
					return c === 1 ? "недела" : "недели";
				},
				d: function(c) {
					return c === 1 ? "ден" : "дена";
				},
				h: function(c) {
					return c === 1 ? "час" : "часа";
				},
				m: function(c) {
					return c === 1 ? "минута" : "минути";
				},
				s: function(c) {
					return c === 1 ? "секунда" : "секунди";
				},
				ms: function(c) {
					return c === 1 ? "милисекунда" : "милисекунди";
				},
				decimal: ","
			},
			mr: {
				y: function(c) {
					return c === 1 ? "वर्ष" : "वर्षे";
				},
				mo: function(c) {
					return c === 1 ? "महिना" : "महिने";
				},
				w: function(c) {
					return c === 1 ? "आठवडा" : "आठवडे";
				},
				d: "दिवस",
				h: "तास",
				m: function(c) {
					return c === 1 ? "मिनिट" : "मिनिटे";
				},
				s: "सेकंद",
				ms: "मिलिसेकंद"
			},
			ms: {
				y: "tahun",
				mo: "bulan",
				w: "minggu",
				d: "hari",
				h: "jam",
				m: "minit",
				s: "saat",
				ms: "milisaat",
				decimal: "."
			},
			nl: {
				y: "jaar",
				mo: function(c) {
					return c === 1 ? "maand" : "maanden";
				},
				w: function(c) {
					return c === 1 ? "week" : "weken";
				},
				d: function(c) {
					return c === 1 ? "dag" : "dagen";
				},
				h: "uur",
				m: function(c) {
					return c === 1 ? "minuut" : "minuten";
				},
				s: function(c) {
					return c === 1 ? "seconde" : "seconden";
				},
				ms: function(c) {
					return c === 1 ? "milliseconde" : "milliseconden";
				},
				decimal: ","
			},
			no: {
				y: "år",
				mo: function(c) {
					return "måned" + (c === 1 ? "" : "er");
				},
				w: function(c) {
					return "uke" + (c === 1 ? "" : "r");
				},
				d: function(c) {
					return "dag" + (c === 1 ? "" : "er");
				},
				h: function(c) {
					return "time" + (c === 1 ? "" : "r");
				},
				m: function(c) {
					return "minutt" + (c === 1 ? "" : "er");
				},
				s: function(c) {
					return "sekund" + (c === 1 ? "" : "er");
				},
				ms: function(c) {
					return "millisekund" + (c === 1 ? "" : "er");
				},
				decimal: ","
			},
			pl: {
				y: function(c) {
					return [
						"rok",
						"roku",
						"lata",
						"lat"
					][getPolishForm(c)];
				},
				mo: function(c) {
					return [
						"miesiąc",
						"miesiąca",
						"miesiące",
						"miesięcy"
					][getPolishForm(c)];
				},
				w: function(c) {
					return [
						"tydzień",
						"tygodnia",
						"tygodnie",
						"tygodni"
					][getPolishForm(c)];
				},
				d: function(c) {
					return [
						"dzień",
						"dnia",
						"dni",
						"dni"
					][getPolishForm(c)];
				},
				h: function(c) {
					return [
						"godzina",
						"godziny",
						"godziny",
						"godzin"
					][getPolishForm(c)];
				},
				m: function(c) {
					return [
						"minuta",
						"minuty",
						"minuty",
						"minut"
					][getPolishForm(c)];
				},
				s: function(c) {
					return [
						"sekunda",
						"sekundy",
						"sekundy",
						"sekund"
					][getPolishForm(c)];
				},
				ms: function(c) {
					return [
						"milisekunda",
						"milisekundy",
						"milisekundy",
						"milisekund"
					][getPolishForm(c)];
				},
				decimal: ","
			},
			pt: {
				y: function(c) {
					return "ano" + (c === 1 ? "" : "s");
				},
				mo: function(c) {
					return c === 1 ? "mês" : "meses";
				},
				w: function(c) {
					return "semana" + (c === 1 ? "" : "s");
				},
				d: function(c) {
					return "dia" + (c === 1 ? "" : "s");
				},
				h: function(c) {
					return "hora" + (c === 1 ? "" : "s");
				},
				m: function(c) {
					return "minuto" + (c === 1 ? "" : "s");
				},
				s: function(c) {
					return "segundo" + (c === 1 ? "" : "s");
				},
				ms: function(c) {
					return "milissegundo" + (c === 1 ? "" : "s");
				},
				decimal: ","
			},
			ro: {
				y: function(c) {
					return c === 1 ? "an" : "ani";
				},
				mo: function(c) {
					return c === 1 ? "lună" : "luni";
				},
				w: function(c) {
					return c === 1 ? "săptămână" : "săptămâni";
				},
				d: function(c) {
					return c === 1 ? "zi" : "zile";
				},
				h: function(c) {
					return c === 1 ? "oră" : "ore";
				},
				m: function(c) {
					return c === 1 ? "minut" : "minute";
				},
				s: function(c) {
					return c === 1 ? "secundă" : "secunde";
				},
				ms: function(c) {
					return c === 1 ? "milisecundă" : "milisecunde";
				},
				decimal: ","
			},
			ru: {
				y: function(c) {
					return [
						"лет",
						"год",
						"года"
					][getSlavicForm(c)];
				},
				mo: function(c) {
					return [
						"месяцев",
						"месяц",
						"месяца"
					][getSlavicForm(c)];
				},
				w: function(c) {
					return [
						"недель",
						"неделя",
						"недели"
					][getSlavicForm(c)];
				},
				d: function(c) {
					return [
						"дней",
						"день",
						"дня"
					][getSlavicForm(c)];
				},
				h: function(c) {
					return [
						"часов",
						"час",
						"часа"
					][getSlavicForm(c)];
				},
				m: function(c) {
					return [
						"минут",
						"минута",
						"минуты"
					][getSlavicForm(c)];
				},
				s: function(c) {
					return [
						"секунд",
						"секунда",
						"секунды"
					][getSlavicForm(c)];
				},
				ms: function(c) {
					return [
						"миллисекунд",
						"миллисекунда",
						"миллисекунды"
					][getSlavicForm(c)];
				},
				decimal: ","
			},
			sq: {
				y: function(c) {
					return c === 1 ? "vit" : "vjet";
				},
				mo: "muaj",
				w: "javë",
				d: "ditë",
				h: "orë",
				m: function(c) {
					return "minut" + (c === 1 ? "ë" : "a");
				},
				s: function(c) {
					return "sekond" + (c === 1 ? "ë" : "a");
				},
				ms: function(c) {
					return "milisekond" + (c === 1 ? "ë" : "a");
				},
				decimal: ","
			},
			sr: {
				y: function(c) {
					return [
						"години",
						"година",
						"године"
					][getSlavicForm(c)];
				},
				mo: function(c) {
					return [
						"месеци",
						"месец",
						"месеца"
					][getSlavicForm(c)];
				},
				w: function(c) {
					return [
						"недељи",
						"недеља",
						"недеље"
					][getSlavicForm(c)];
				},
				d: function(c) {
					return [
						"дани",
						"дан",
						"дана"
					][getSlavicForm(c)];
				},
				h: function(c) {
					return [
						"сати",
						"сат",
						"сата"
					][getSlavicForm(c)];
				},
				m: function(c) {
					return [
						"минута",
						"минут",
						"минута"
					][getSlavicForm(c)];
				},
				s: function(c) {
					return [
						"секунди",
						"секунда",
						"секунде"
					][getSlavicForm(c)];
				},
				ms: function(c) {
					return [
						"милисекунди",
						"милисекунда",
						"милисекунде"
					][getSlavicForm(c)];
				},
				decimal: ","
			},
			ta: {
				y: function(c) {
					return c === 1 ? "வருடம்" : "ஆண்டுகள்";
				},
				mo: function(c) {
					return c === 1 ? "மாதம்" : "மாதங்கள்";
				},
				w: function(c) {
					return c === 1 ? "வாரம்" : "வாரங்கள்";
				},
				d: function(c) {
					return c === 1 ? "நாள்" : "நாட்கள்";
				},
				h: function(c) {
					return c === 1 ? "மணி" : "மணிநேரம்";
				},
				m: function(c) {
					return "நிமிட" + (c === 1 ? "ம்" : "ங்கள்");
				},
				s: function(c) {
					return "வினாடி" + (c === 1 ? "" : "கள்");
				},
				ms: function(c) {
					return "மில்லி விநாடி" + (c === 1 ? "" : "கள்");
				}
			},
			te: {
				y: function(c) {
					return "సంవత్స" + (c === 1 ? "రం" : "రాల");
				},
				mo: function(c) {
					return "నెల" + (c === 1 ? "" : "ల");
				},
				w: function(c) {
					return c === 1 ? "వారం" : "వారాలు";
				},
				d: function(c) {
					return "రోజు" + (c === 1 ? "" : "లు");
				},
				h: function(c) {
					return "గంట" + (c === 1 ? "" : "లు");
				},
				m: function(c) {
					return c === 1 ? "నిమిషం" : "నిమిషాలు";
				},
				s: function(c) {
					return c === 1 ? "సెకను" : "సెకన్లు";
				},
				ms: function(c) {
					return c === 1 ? "మిల్లీసెకన్" : "మిల్లీసెకన్లు";
				}
			},
			uk: {
				y: function(c) {
					return [
						"років",
						"рік",
						"роки"
					][getSlavicForm(c)];
				},
				mo: function(c) {
					return [
						"місяців",
						"місяць",
						"місяці"
					][getSlavicForm(c)];
				},
				w: function(c) {
					return [
						"тижнів",
						"тиждень",
						"тижні"
					][getSlavicForm(c)];
				},
				d: function(c) {
					return [
						"днів",
						"день",
						"дні"
					][getSlavicForm(c)];
				},
				h: function(c) {
					return [
						"годин",
						"година",
						"години"
					][getSlavicForm(c)];
				},
				m: function(c) {
					return [
						"хвилин",
						"хвилина",
						"хвилини"
					][getSlavicForm(c)];
				},
				s: function(c) {
					return [
						"секунд",
						"секунда",
						"секунди"
					][getSlavicForm(c)];
				},
				ms: function(c) {
					return [
						"мілісекунд",
						"мілісекунда",
						"мілісекунди"
					][getSlavicForm(c)];
				},
				decimal: ","
			},
			ur: {
				y: "سال",
				mo: function(c) {
					return c === 1 ? "مہینہ" : "مہینے";
				},
				w: function(c) {
					return c === 1 ? "ہفتہ" : "ہفتے";
				},
				d: "دن",
				h: function(c) {
					return c === 1 ? "گھنٹہ" : "گھنٹے";
				},
				m: "منٹ",
				s: "سیکنڈ",
				ms: "ملی سیکنڈ",
				decimal: "."
			},
			sk: {
				y: function(c) {
					return [
						"rok",
						"roky",
						"roky",
						"rokov"
					][getCzechOrSlovakForm(c)];
				},
				mo: function(c) {
					return [
						"mesiac",
						"mesiace",
						"mesiace",
						"mesiacov"
					][getCzechOrSlovakForm(c)];
				},
				w: function(c) {
					return [
						"týždeň",
						"týždne",
						"týždne",
						"týždňov"
					][getCzechOrSlovakForm(c)];
				},
				d: function(c) {
					return [
						"deň",
						"dni",
						"dni",
						"dní"
					][getCzechOrSlovakForm(c)];
				},
				h: function(c) {
					return [
						"hodina",
						"hodiny",
						"hodiny",
						"hodín"
					][getCzechOrSlovakForm(c)];
				},
				m: function(c) {
					return [
						"minúta",
						"minúty",
						"minúty",
						"minút"
					][getCzechOrSlovakForm(c)];
				},
				s: function(c) {
					return [
						"sekunda",
						"sekundy",
						"sekundy",
						"sekúnd"
					][getCzechOrSlovakForm(c)];
				},
				ms: function(c) {
					return [
						"milisekunda",
						"milisekundy",
						"milisekundy",
						"milisekúnd"
					][getCzechOrSlovakForm(c)];
				},
				decimal: ","
			},
			sl: {
				y: function(c) {
					if (c % 10 === 1) return "leto";
					else if (c % 100 === 2) return "leti";
					else if (c % 100 === 3 || c % 100 === 4 || Math.floor(c) !== c && c % 100 <= 5) return "leta";
					else return "let";
				},
				mo: function(c) {
					if (c % 10 === 1) return "mesec";
					else if (c % 100 === 2 || Math.floor(c) !== c && c % 100 <= 5) return "meseca";
					else if (c % 10 === 3 || c % 10 === 4) return "mesece";
					else return "mesecev";
				},
				w: function(c) {
					if (c % 10 === 1) return "teden";
					else if (c % 10 === 2 || Math.floor(c) !== c && c % 100 <= 4) return "tedna";
					else if (c % 10 === 3 || c % 10 === 4) return "tedne";
					else return "tednov";
				},
				d: function(c) {
					return c % 100 === 1 ? "dan" : "dni";
				},
				h: function(c) {
					if (c % 10 === 1) return "ura";
					else if (c % 100 === 2) return "uri";
					else if (c % 10 === 3 || c % 10 === 4 || Math.floor(c) !== c) return "ure";
					else return "ur";
				},
				m: function(c) {
					if (c % 10 === 1) return "minuta";
					else if (c % 10 === 2) return "minuti";
					else if (c % 10 === 3 || c % 10 === 4 || Math.floor(c) !== c && c % 100 <= 4) return "minute";
					else return "minut";
				},
				s: function(c) {
					if (c % 10 === 1) return "sekunda";
					else if (c % 100 === 2) return "sekundi";
					else if (c % 100 === 3 || c % 100 === 4 || Math.floor(c) !== c) return "sekunde";
					else return "sekund";
				},
				ms: function(c) {
					if (c % 10 === 1) return "milisekunda";
					else if (c % 100 === 2) return "milisekundi";
					else if (c % 100 === 3 || c % 100 === 4 || Math.floor(c) !== c) return "milisekunde";
					else return "milisekund";
				},
				decimal: ","
			},
			sv: {
				y: "år",
				mo: function(c) {
					return "månad" + (c === 1 ? "" : "er");
				},
				w: function(c) {
					return "veck" + (c === 1 ? "a" : "or");
				},
				d: function(c) {
					return "dag" + (c === 1 ? "" : "ar");
				},
				h: function(c) {
					return "timm" + (c === 1 ? "e" : "ar");
				},
				m: function(c) {
					return "minut" + (c === 1 ? "" : "er");
				},
				s: function(c) {
					return "sekund" + (c === 1 ? "" : "er");
				},
				ms: function(c) {
					return "millisekund" + (c === 1 ? "" : "er");
				},
				decimal: ","
			},
			sw: {
				y: function(c) {
					return c === 1 ? "mwaka" : "miaka";
				},
				mo: function(c) {
					return c === 1 ? "mwezi" : "miezi";
				},
				w: "wiki",
				d: function(c) {
					return c === 1 ? "siku" : "masiku";
				},
				h: function(c) {
					return c === 1 ? "saa" : "masaa";
				},
				m: "dakika",
				s: "sekunde",
				ms: "milisekunde",
				decimal: ".",
				_numberFirst: true
			},
			tr: {
				y: "yıl",
				mo: "ay",
				w: "hafta",
				d: "gün",
				h: "saat",
				m: "dakika",
				s: "saniye",
				ms: "milisaniye",
				decimal: ","
			},
			th: {
				y: "ปี",
				mo: "เดือน",
				w: "สัปดาห์",
				d: "วัน",
				h: "ชั่วโมง",
				m: "นาที",
				s: "วินาที",
				ms: "มิลลิวินาที",
				decimal: "."
			},
			vi: {
				y: "năm",
				mo: "tháng",
				w: "tuần",
				d: "ngày",
				h: "giờ",
				m: "phút",
				s: "giây",
				ms: "mili giây",
				decimal: ","
			},
			zh_CN: {
				y: "年",
				mo: "个月",
				w: "周",
				d: "天",
				h: "小时",
				m: "分钟",
				s: "秒",
				ms: "毫秒",
				decimal: "."
			},
			zh_TW: {
				y: "年",
				mo: "個月",
				w: "周",
				d: "天",
				h: "小時",
				m: "分鐘",
				s: "秒",
				ms: "毫秒",
				decimal: "."
			}
		};
		function humanizer(passedOptions) {
			var result = function humanizer(ms, humanizerOptions) {
				return doHumanization(ms, assign({}, result, humanizerOptions || {}));
			};
			return assign(result, {
				language: "en",
				spacer: " ",
				conjunction: "",
				serialComma: true,
				units: [
					"y",
					"mo",
					"w",
					"d",
					"h",
					"m",
					"s"
				],
				languages: {},
				round: false,
				unitMeasures: {
					y: 315576e5,
					mo: 26298e5,
					w: 6048e5,
					d: 864e5,
					h: 36e5,
					m: 6e4,
					s: 1e3,
					ms: 1
				}
			}, passedOptions);
		}
		var humanizeDuration = humanizer({});
		function getDictionary(options) {
			var languagesFromOptions = [options.language];
			if (has(options, "fallbacks")) {
				if (isArray(options.fallbacks) && options.fallbacks.length) languagesFromOptions = languagesFromOptions.concat(options.fallbacks);
				else throw new Error("fallbacks must be an array with at least one element");
			}
			for (var i = 0; i < languagesFromOptions.length; i++) {
				var languageToTry = languagesFromOptions[i];
				if (has(options.languages, languageToTry)) return options.languages[languageToTry];
				else if (has(LANGUAGES, languageToTry)) return LANGUAGES[languageToTry];
			}
			throw new Error("No language found.");
		}
		function doHumanization(ms, options) {
			var i, len, piece;
			ms = Math.abs(ms);
			var dictionary = getDictionary(options);
			var pieces = [];
			var unitName, unitMS, unitCount;
			for (i = 0, len = options.units.length; i < len; i++) {
				unitName = options.units[i];
				unitMS = options.unitMeasures[unitName];
				if (i + 1 === len) {
					if (has(options, "maxDecimalPoints")) {
						var expValue = Math.pow(10, options.maxDecimalPoints);
						var unitCountFloat = ms / unitMS;
						unitCount = parseFloat((Math.floor(expValue * unitCountFloat) / expValue).toFixed(options.maxDecimalPoints));
					} else unitCount = ms / unitMS;
				} else unitCount = Math.floor(ms / unitMS);
				pieces.push({
					unitCount,
					unitName
				});
				ms -= unitCount * unitMS;
			}
			var firstOccupiedUnitIndex = 0;
			for (i = 0; i < pieces.length; i++) if (pieces[i].unitCount) {
				firstOccupiedUnitIndex = i;
				break;
			}
			if (options.round) {
				var ratioToLargerUnit, previousPiece;
				for (i = pieces.length - 1; i >= 0; i--) {
					piece = pieces[i];
					piece.unitCount = Math.round(piece.unitCount);
					if (i === 0) break;
					previousPiece = pieces[i - 1];
					ratioToLargerUnit = options.unitMeasures[previousPiece.unitName] / options.unitMeasures[piece.unitName];
					if (piece.unitCount % ratioToLargerUnit === 0 || options.largest && options.largest - 1 < i - firstOccupiedUnitIndex) {
						previousPiece.unitCount += piece.unitCount / ratioToLargerUnit;
						piece.unitCount = 0;
					}
				}
			}
			var result = [];
			for (i = 0, pieces.length; i < len; i++) {
				piece = pieces[i];
				if (piece.unitCount) result.push(render(piece.unitCount, piece.unitName, dictionary, options));
				if (result.length === options.largest) break;
			}
			if (result.length) {
				var delimiter;
				if (has(options, "delimiter")) delimiter = options.delimiter;
				else if (has(dictionary, "delimiter")) delimiter = dictionary.delimiter;
				else delimiter = ", ";
				if (!options.conjunction || result.length === 1) return result.join(delimiter);
				else if (result.length === 2) return result.join(options.conjunction);
				else if (result.length > 2) return result.slice(0, -1).join(delimiter) + (options.serialComma ? "," : "") + options.conjunction + result.slice(-1);
			} else return render(0, options.units[options.units.length - 1], dictionary, options);
		}
		function render(count, type, dictionary, options) {
			var decimal;
			if (has(options, "decimal")) decimal = options.decimal;
			else if (has(dictionary, "decimal")) decimal = dictionary.decimal;
			else decimal = ".";
			var countStr;
			if (typeof dictionary._formatCount === "function") countStr = dictionary._formatCount(count, decimal);
			else countStr = count.toString().replace(".", decimal);
			var dictionaryValue = dictionary[type];
			var word;
			if (typeof dictionaryValue === "function") word = dictionaryValue(count);
			else word = dictionaryValue;
			if (dictionary._numberFirst) return word + options.spacer + countStr;
			return countStr + options.spacer + word;
		}
		function assign(destination) {
			var source;
			for (var i = 1; i < arguments.length; i++) {
				source = arguments[i];
				for (var prop in source) if (has(source, prop)) destination[prop] = source[prop];
			}
			return destination;
		}
		function getArabicForm(c) {
			if (c === 1) return 0;
			if (c === 2) return 1;
			if (c > 2 && c < 11) return 2;
			return 0;
		}
		function getPolishForm(c) {
			if (c === 1) return 0;
			else if (Math.floor(c) !== c) return 1;
			else if (c % 10 >= 2 && c % 10 <= 4 && !(c % 100 > 10 && c % 100 < 20)) return 2;
			else return 3;
		}
		function getSlavicForm(c) {
			if (Math.floor(c) !== c) return 2;
			else if (c % 100 >= 5 && c % 100 <= 20 || c % 10 >= 5 && c % 10 <= 9 || c % 10 === 0) return 0;
			else if (c % 10 === 1) return 1;
			else if (c > 1) return 2;
			else return 0;
		}
		function getCzechOrSlovakForm(c) {
			if (c === 1) return 0;
			else if (Math.floor(c) !== c) return 1;
			else if (c % 10 >= 2 && c % 10 <= 4 && c % 100 < 10) return 2;
			else return 3;
		}
		function getLithuanianForm(c) {
			if (c === 1 || c % 10 === 1 && c % 100 > 20) return 0;
			else if (Math.floor(c) !== c || c % 10 >= 2 && c % 100 > 20 || c % 10 >= 2 && c % 100 < 10) return 1;
			else return 2;
		}
		function getLatvianForm(c) {
			return c % 10 === 1 && c % 100 !== 11;
		}
		var isArray = Array.isArray || function(arg) {
			return Object.prototype.toString.call(arg) === "[object Array]";
		};
		function has(obj, key) {
			return Object.prototype.hasOwnProperty.call(obj, key);
		}
		humanizeDuration.getSupportedLanguages = function getSupportedLanguages() {
			var result = [];
			for (var language in LANGUAGES) if (has(LANGUAGES, language) && language !== "gr") result.push(language);
			return result;
		};
		humanizeDuration.humanizer = humanizer;
		if (typeof define === "function" && define.amd) define(function() {
			return humanizeDuration;
		});
		else if (typeof module !== "undefined" && module.exports) module.exports = humanizeDuration;
		else this.humanizeDuration = humanizeDuration;
	})();
}));
//#endregion
//#region ../../../node_modules/.pnpm/@vue+compiler-core@3.5.26/node_modules/@vue/compiler-core/dist/compiler-core.esm-bundler.js
/**
* @vue/compiler-core v3.5.26
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
function registerRuntimeHelpers(helpers) {
	Object.getOwnPropertySymbols(helpers).forEach((s) => {
		helperNameMap[s] = helpers[s];
	});
}
function createRoot(children, source = "") {
	return {
		type: 0,
		source,
		children,
		helpers: /* @__PURE__ */ new Set(),
		components: [],
		directives: [],
		hoists: [],
		imports: [],
		cached: [],
		temps: 0,
		codegenNode: void 0,
		loc: locStub
	};
}
function createVNodeCall(context, tag, props, children, patchFlag, dynamicProps, directives, isBlock = false, disableTracking = false, isComponent = false, loc = locStub) {
	if (context) {
		if (isBlock) {
			context.helper(OPEN_BLOCK);
			context.helper(getVNodeBlockHelper(context.inSSR, isComponent));
		} else context.helper(getVNodeHelper(context.inSSR, isComponent));
		if (directives) context.helper(WITH_DIRECTIVES);
	}
	return {
		type: 13,
		tag,
		props,
		children,
		patchFlag,
		dynamicProps,
		directives,
		isBlock,
		disableTracking,
		isComponent,
		loc
	};
}
function createArrayExpression(elements, loc = locStub) {
	return {
		type: 17,
		loc,
		elements
	};
}
function createObjectExpression(properties, loc = locStub) {
	return {
		type: 15,
		loc,
		properties
	};
}
function createObjectProperty(key, value) {
	return {
		type: 16,
		loc: locStub,
		key: isString(key) ? createSimpleExpression(key, true) : key,
		value
	};
}
function createSimpleExpression(content, isStatic = false, loc = locStub, constType = 0) {
	return {
		type: 4,
		loc,
		content,
		isStatic,
		constType: isStatic ? 3 : constType
	};
}
function createInterpolation(content, loc) {
	return {
		type: 5,
		loc,
		content: isString(content) ? createSimpleExpression(content, false, loc) : content
	};
}
function createCompoundExpression(children, loc = locStub) {
	return {
		type: 8,
		loc,
		children
	};
}
function createCallExpression(callee, args = [], loc = locStub) {
	return {
		type: 14,
		loc,
		callee,
		arguments: args
	};
}
function createFunctionExpression(params, returns = void 0, newline = false, isSlot = false, loc = locStub) {
	return {
		type: 18,
		params,
		returns,
		newline,
		isSlot,
		loc
	};
}
function createConditionalExpression(test, consequent, alternate, newline = true) {
	return {
		type: 19,
		test,
		consequent,
		alternate,
		newline,
		loc: locStub
	};
}
function createCacheExpression(index, value, needPauseTracking = false, inVOnce = false) {
	return {
		type: 20,
		index,
		value,
		needPauseTracking,
		inVOnce,
		needArraySpread: false,
		loc: locStub
	};
}
function createBlockStatement(body) {
	return {
		type: 21,
		body,
		loc: locStub
	};
}
function createTemplateLiteral(elements) {
	return {
		type: 22,
		elements,
		loc: locStub
	};
}
function createIfStatement(test, consequent, alternate) {
	return {
		type: 23,
		test,
		consequent,
		alternate,
		loc: locStub
	};
}
function createAssignmentExpression(left, right) {
	return {
		type: 24,
		left,
		right,
		loc: locStub
	};
}
function createSequenceExpression(expressions) {
	return {
		type: 25,
		expressions,
		loc: locStub
	};
}
function createReturnStatement(returns) {
	return {
		type: 26,
		returns,
		loc: locStub
	};
}
function getVNodeHelper(ssr, isComponent) {
	return ssr || isComponent ? CREATE_VNODE : CREATE_ELEMENT_VNODE;
}
function getVNodeBlockHelper(ssr, isComponent) {
	return ssr || isComponent ? CREATE_BLOCK : CREATE_ELEMENT_BLOCK;
}
function convertToBlock(node, { helper, removeHelper, inSSR }) {
	if (!node.isBlock) {
		node.isBlock = true;
		removeHelper(getVNodeHelper(inSSR, node.isComponent));
		helper(OPEN_BLOCK);
		helper(getVNodeBlockHelper(inSSR, node.isComponent));
	}
}
function isTagStartChar(c) {
	return c >= 97 && c <= 122 || c >= 65 && c <= 90;
}
function isWhitespace(c) {
	return c === 32 || c === 10 || c === 9 || c === 12 || c === 13;
}
function isEndOfTagSection(c) {
	return c === 47 || c === 62 || isWhitespace(c);
}
function toCharCodes(str) {
	const ret = new Uint8Array(str.length);
	for (let i = 0; i < str.length; i++) ret[i] = str.charCodeAt(i);
	return ret;
}
function getCompatValue(key, { compatConfig }) {
	const value = compatConfig && compatConfig[key];
	if (key === "MODE") return value || 3;
	else return value;
}
function isCompatEnabled(key, context) {
	const mode = getCompatValue("MODE", context);
	const value = getCompatValue(key, context);
	return mode === 3 ? value === true : value !== false;
}
function checkCompatEnabled(key, context, loc, ...args) {
	return isCompatEnabled(key, context);
}
function warnDeprecation(key, context, loc, ...args) {
	if (getCompatValue(key, context) === "suppress-warning") return;
	const { message, link } = deprecationData[key];
	const msg = `(deprecation ${key}) ${typeof message === "function" ? message(...args) : message}${link ? `
  Details: ${link}` : ``}`;
	const err = new SyntaxError(msg);
	err.code = key;
	if (loc) err.loc = loc;
	context.onWarn(err);
}
function defaultOnError(error) {
	throw error;
}
function defaultOnWarn(msg) {}
function createCompilerError(code, loc, messages, additionalMessage) {
	const msg = `https://vuejs.org/error-reference/#compiler-${code}`;
	const error = new SyntaxError(String(msg));
	error.code = code;
	error.loc = loc;
	return error;
}
function walkIdentifiers(root, onIdentifier, includeAll = false, parentStack = [], knownIds = /* @__PURE__ */ Object.create(null)) {}
function isReferencedIdentifier(id, parent, parentStack) {
	return false;
}
function isInDestructureAssignment(parent, parentStack) {
	if (parent && (parent.type === "ObjectProperty" || parent.type === "ArrayPattern")) {
		let i = parentStack.length;
		while (i--) {
			const p = parentStack[i];
			if (p.type === "AssignmentExpression") return true;
			else if (p.type !== "ObjectProperty" && !p.type.endsWith("Pattern")) break;
		}
	}
	return false;
}
function isInNewExpression(parentStack) {
	let i = parentStack.length;
	while (i--) {
		const p = parentStack[i];
		if (p.type === "NewExpression") return true;
		else if (p.type !== "MemberExpression") break;
	}
	return false;
}
function walkFunctionParams(node, onIdent) {
	for (const p of node.params) for (const id of extractIdentifiers(p)) onIdent(id);
}
function walkBlockDeclarations(block, onIdent) {
	const body = block.type === "SwitchCase" ? block.consequent : block.body;
	for (const stmt of body) if (stmt.type === "VariableDeclaration") {
		if (stmt.declare) continue;
		for (const decl of stmt.declarations) for (const id of extractIdentifiers(decl.id)) onIdent(id);
	} else if (stmt.type === "FunctionDeclaration" || stmt.type === "ClassDeclaration") {
		if (stmt.declare || !stmt.id) continue;
		onIdent(stmt.id);
	} else if (isForStatement(stmt)) walkForStatement(stmt, true, onIdent);
	else if (stmt.type === "SwitchStatement") walkSwitchStatement(stmt, true, onIdent);
}
function isForStatement(stmt) {
	return stmt.type === "ForOfStatement" || stmt.type === "ForInStatement" || stmt.type === "ForStatement";
}
function walkForStatement(stmt, isVar, onIdent) {
	const variable = stmt.type === "ForStatement" ? stmt.init : stmt.left;
	if (variable && variable.type === "VariableDeclaration" && (variable.kind === "var" ? isVar : !isVar)) for (const decl of variable.declarations) for (const id of extractIdentifiers(decl.id)) onIdent(id);
}
function walkSwitchStatement(stmt, isVar, onIdent) {
	for (const cs of stmt.cases) {
		for (const stmt2 of cs.consequent) if (stmt2.type === "VariableDeclaration" && (stmt2.kind === "var" ? isVar : !isVar)) for (const decl of stmt2.declarations) for (const id of extractIdentifiers(decl.id)) onIdent(id);
		walkBlockDeclarations(cs, onIdent);
	}
}
function extractIdentifiers(param, nodes = []) {
	switch (param.type) {
		case "Identifier":
			nodes.push(param);
			break;
		case "MemberExpression":
			let object = param;
			while (object.type === "MemberExpression") object = object.object;
			nodes.push(object);
			break;
		case "ObjectPattern":
			for (const prop of param.properties) if (prop.type === "RestElement") extractIdentifiers(prop.argument, nodes);
			else extractIdentifiers(prop.value, nodes);
			break;
		case "ArrayPattern":
			param.elements.forEach((element) => {
				if (element) extractIdentifiers(element, nodes);
			});
			break;
		case "RestElement":
			extractIdentifiers(param.argument, nodes);
			break;
		case "AssignmentPattern": extractIdentifiers(param.left, nodes);
	}
	return nodes;
}
function unwrapTSNode(node) {
	if (TS_NODE_TYPES.includes(node.type)) return unwrapTSNode(node.expression);
	else return node;
}
function isCoreComponent(tag) {
	switch (tag) {
		case "Teleport":
		case "teleport": return TELEPORT;
		case "Suspense":
		case "suspense": return SUSPENSE;
		case "KeepAlive":
		case "keep-alive": return KEEP_ALIVE;
		case "BaseTransition":
		case "base-transition": return BASE_TRANSITION;
	}
}
function advancePositionWithClone(pos, source, numberOfCharacters = source.length) {
	return advancePositionWithMutation({
		offset: pos.offset,
		line: pos.line,
		column: pos.column
	}, source, numberOfCharacters);
}
function advancePositionWithMutation(pos, source, numberOfCharacters = source.length) {
	let linesCount = 0;
	let lastNewLinePos = -1;
	for (let i = 0; i < numberOfCharacters; i++) if (source.charCodeAt(i) === 10) {
		linesCount++;
		lastNewLinePos = i;
	}
	pos.offset += numberOfCharacters;
	pos.line += linesCount;
	pos.column = lastNewLinePos === -1 ? pos.column + numberOfCharacters : numberOfCharacters - lastNewLinePos;
	return pos;
}
function assert(condition, msg) {
	if (!condition) throw new Error(msg || `unexpected compiler condition`);
}
function findDir(node, name, allowEmpty = false) {
	for (let i = 0; i < node.props.length; i++) {
		const p = node.props[i];
		if (p.type === 7 && (allowEmpty || p.exp) && (isString(name) ? p.name === name : name.test(p.name))) return p;
	}
}
function findProp(node, name, dynamicOnly = false, allowEmpty = false) {
	for (let i = 0; i < node.props.length; i++) {
		const p = node.props[i];
		if (p.type === 6) {
			if (dynamicOnly) continue;
			if (p.name === name && (p.value || allowEmpty)) return p;
		} else if (p.name === "bind" && (p.exp || allowEmpty) && isStaticArgOf(p.arg, name)) return p;
	}
}
function isStaticArgOf(arg, name) {
	return !!(arg && isStaticExp(arg) && arg.content === name);
}
function hasDynamicKeyVBind(node) {
	return node.props.some((p) => p.type === 7 && p.name === "bind" && (!p.arg || p.arg.type !== 4 || !p.arg.isStatic));
}
function isText$1(node) {
	return node.type === 5 || node.type === 2;
}
function isVPre(p) {
	return p.type === 7 && p.name === "pre";
}
function isVSlot(p) {
	return p.type === 7 && p.name === "slot";
}
function isTemplateNode(node) {
	return node.type === 1 && node.tagType === 3;
}
function isSlotOutlet(node) {
	return node.type === 1 && node.tagType === 2;
}
function getUnnormalizedProps(props, callPath = []) {
	if (props && !isString(props) && props.type === 14) {
		const callee = props.callee;
		if (!isString(callee) && propsHelperSet.has(callee)) return getUnnormalizedProps(props.arguments[0], callPath.concat(props));
	}
	return [props, callPath];
}
function injectProp(node, prop, context) {
	let propsWithInjection;
	let props = node.type === 13 ? node.props : node.arguments[2];
	let callPath = [];
	let parentCall;
	if (props && !isString(props) && props.type === 14) {
		const ret = getUnnormalizedProps(props);
		props = ret[0];
		callPath = ret[1];
		parentCall = callPath[callPath.length - 1];
	}
	if (props == null || isString(props)) propsWithInjection = createObjectExpression([prop]);
	else if (props.type === 14) {
		const first = props.arguments[0];
		if (!isString(first) && first.type === 15) {
			if (!hasProp(prop, first)) first.properties.unshift(prop);
		} else if (props.callee === TO_HANDLERS) propsWithInjection = createCallExpression(context.helper(MERGE_PROPS), [createObjectExpression([prop]), props]);
		else props.arguments.unshift(createObjectExpression([prop]));
		!propsWithInjection && (propsWithInjection = props);
	} else if (props.type === 15) {
		if (!hasProp(prop, props)) props.properties.unshift(prop);
		propsWithInjection = props;
	} else {
		propsWithInjection = createCallExpression(context.helper(MERGE_PROPS), [createObjectExpression([prop]), props]);
		if (parentCall && parentCall.callee === GUARD_REACTIVE_PROPS) parentCall = callPath[callPath.length - 2];
	}
	if (node.type === 13) {
		if (parentCall) parentCall.arguments[0] = propsWithInjection;
		else node.props = propsWithInjection;
	} else if (parentCall) parentCall.arguments[0] = propsWithInjection;
	else node.arguments[2] = propsWithInjection;
}
function hasProp(prop, props) {
	let result = false;
	if (prop.key.type === 4) {
		const propKeyName = prop.key.content;
		result = props.properties.some((p) => p.key.type === 4 && p.key.content === propKeyName);
	}
	return result;
}
function toValidAssetId(name, type) {
	return `_${type}_${name.replace(/[^\w]/g, (searchValue, replaceValue) => {
		return searchValue === "-" ? "_" : name.charCodeAt(replaceValue).toString();
	})}`;
}
function hasScopeRef(node, ids) {
	if (!node || Object.keys(ids).length === 0) return false;
	switch (node.type) {
		case 1:
			for (let i = 0; i < node.props.length; i++) {
				const p = node.props[i];
				if (p.type === 7 && (hasScopeRef(p.arg, ids) || hasScopeRef(p.exp, ids))) return true;
			}
			return node.children.some((c) => hasScopeRef(c, ids));
		case 11:
			if (hasScopeRef(node.source, ids)) return true;
			return node.children.some((c) => hasScopeRef(c, ids));
		case 9: return node.branches.some((b) => hasScopeRef(b, ids));
		case 10:
			if (hasScopeRef(node.condition, ids)) return true;
			return node.children.some((c) => hasScopeRef(c, ids));
		case 4: return !node.isStatic && isSimpleIdentifier(node.content) && !!ids[node.content];
		case 8: return node.children.some((c) => isObject(c) && hasScopeRef(c, ids));
		case 5:
		case 12: return hasScopeRef(node.content, ids);
		case 2:
		case 3:
		case 20: return false;
		default: return false;
	}
}
function getMemoedVNodeCall(node) {
	if (node.type === 14 && node.callee === WITH_MEMO) return node.arguments[1].returns;
	else return node;
}
function isAllWhitespace(str) {
	for (let i = 0; i < str.length; i++) if (!isWhitespace(str.charCodeAt(i))) return false;
	return true;
}
function isWhitespaceText(node) {
	return node.type === 2 && isAllWhitespace(node.content) || node.type === 12 && isWhitespaceText(node.content);
}
function isCommentOrWhitespace(node) {
	return node.type === 3 || isWhitespaceText(node);
}
function parseForExpression(input) {
	const loc = input.loc;
	const exp = input.content;
	const inMatch = exp.match(forAliasRE);
	if (!inMatch) return;
	const [, LHS, RHS] = inMatch;
	const createAliasExpression = (content, offset, asParam = false) => {
		const start = loc.start.offset + offset;
		return createExp(content, false, getLoc(start, start + content.length), 0, asParam ? 1 : 0);
	};
	const result = {
		source: createAliasExpression(RHS.trim(), exp.indexOf(RHS, LHS.length)),
		value: void 0,
		key: void 0,
		index: void 0,
		finalized: false
	};
	let valueContent = LHS.trim().replace(stripParensRE, "").trim();
	const trimmedOffset = LHS.indexOf(valueContent);
	const iteratorMatch = valueContent.match(forIteratorRE);
	if (iteratorMatch) {
		valueContent = valueContent.replace(forIteratorRE, "").trim();
		const keyContent = iteratorMatch[1].trim();
		let keyOffset;
		if (keyContent) {
			keyOffset = exp.indexOf(keyContent, trimmedOffset + valueContent.length);
			result.key = createAliasExpression(keyContent, keyOffset, true);
		}
		if (iteratorMatch[2]) {
			const indexContent = iteratorMatch[2].trim();
			if (indexContent) result.index = createAliasExpression(indexContent, exp.indexOf(indexContent, result.key ? keyOffset + keyContent.length : trimmedOffset + valueContent.length), true);
		}
	}
	if (valueContent) result.value = createAliasExpression(valueContent, trimmedOffset, true);
	return result;
}
function getSlice(start, end) {
	return currentInput.slice(start, end);
}
function endOpenTag(end) {
	if (tokenizer.inSFCRoot) currentOpenTag.innerLoc = getLoc(end + 1, end + 1);
	addNode(currentOpenTag);
	const { tag, ns } = currentOpenTag;
	if (ns === 0 && currentOptions.isPreTag(tag)) inPre++;
	if (currentOptions.isVoidTag(tag)) onCloseTag(currentOpenTag, end);
	else {
		stack.unshift(currentOpenTag);
		if (ns === 1 || ns === 2) tokenizer.inXML = true;
	}
	currentOpenTag = null;
}
function onText(content, start, end) {
	{
		const tag = stack[0] && stack[0].tag;
		if (tag !== "script" && tag !== "style" && content.includes("&")) content = currentOptions.decodeEntities(content, false);
	}
	const parent = stack[0] || currentRoot;
	const lastNode = parent.children[parent.children.length - 1];
	if (lastNode && lastNode.type === 2) {
		lastNode.content += content;
		setLocEnd(lastNode.loc, end);
	} else parent.children.push({
		type: 2,
		content,
		loc: getLoc(start, end)
	});
}
function onCloseTag(el, end, isImplied = false) {
	if (isImplied) setLocEnd(el.loc, backTrack(end, 60));
	else setLocEnd(el.loc, lookAhead(end, 62) + 1);
	if (tokenizer.inSFCRoot) {
		if (el.children.length) el.innerLoc.end = extend({}, el.children[el.children.length - 1].loc.end);
		else el.innerLoc.end = extend({}, el.innerLoc.start);
		el.innerLoc.source = getSlice(el.innerLoc.start.offset, el.innerLoc.end.offset);
	}
	const { tag, ns, children } = el;
	if (!inVPre) {
		if (tag === "slot") el.tagType = 2;
		else if (isFragmentTemplate(el)) el.tagType = 3;
		else if (isComponent(el)) el.tagType = 1;
	}
	if (!tokenizer.inRCDATA) el.children = condenseWhitespace(children);
	if (ns === 0 && currentOptions.isIgnoreNewlineTag(tag)) {
		const first = children[0];
		if (first && first.type === 2) first.content = first.content.replace(/^\r?\n/, "");
	}
	if (ns === 0 && currentOptions.isPreTag(tag)) inPre--;
	if (currentVPreBoundary === el) {
		inVPre = tokenizer.inVPre = false;
		currentVPreBoundary = null;
	}
	if (tokenizer.inXML && (stack[0] ? stack[0].ns : currentOptions.ns) === 0) tokenizer.inXML = false;
	{
		const props = el.props;
		if (!tokenizer.inSFCRoot && isCompatEnabled("COMPILER_NATIVE_TEMPLATE", currentOptions) && el.tag === "template" && !isFragmentTemplate(el)) {
			const parent = stack[0] || currentRoot;
			const index = parent.children.indexOf(el);
			parent.children.splice(index, 1, ...el.children);
		}
		const inlineTemplateProp = props.find((p) => p.type === 6 && p.name === "inline-template");
		if (inlineTemplateProp && checkCompatEnabled("COMPILER_INLINE_TEMPLATE", currentOptions, inlineTemplateProp.loc) && el.children.length) inlineTemplateProp.value = {
			type: 2,
			content: getSlice(el.children[0].loc.start.offset, el.children[el.children.length - 1].loc.end.offset),
			loc: inlineTemplateProp.loc
		};
	}
}
function lookAhead(index, c) {
	let i = index;
	while (currentInput.charCodeAt(i) !== c && i < currentInput.length - 1) i++;
	return i;
}
function backTrack(index, c) {
	let i = index;
	while (currentInput.charCodeAt(i) !== c && i >= 0) i--;
	return i;
}
function isFragmentTemplate({ tag, props }) {
	if (tag === "template") {
		for (let i = 0; i < props.length; i++) if (props[i].type === 7 && specialTemplateDir.has(props[i].name)) return true;
	}
	return false;
}
function isComponent({ tag, props }) {
	if (currentOptions.isCustomElement(tag)) return false;
	if (tag === "component" || isUpperCase(tag.charCodeAt(0)) || isCoreComponent(tag) || currentOptions.isBuiltInComponent && currentOptions.isBuiltInComponent(tag) || currentOptions.isNativeTag && !currentOptions.isNativeTag(tag)) return true;
	for (let i = 0; i < props.length; i++) {
		const p = props[i];
		if (p.type === 6) {
			if (p.name === "is" && p.value) {
				if (p.value.content.startsWith("vue:")) return true;
				else if (checkCompatEnabled("COMPILER_IS_ON_ELEMENT", currentOptions, p.loc)) return true;
			}
		} else if (p.name === "bind" && isStaticArgOf(p.arg, "is") && checkCompatEnabled("COMPILER_IS_ON_ELEMENT", currentOptions, p.loc)) return true;
	}
	return false;
}
function isUpperCase(c) {
	return c > 64 && c < 91;
}
function condenseWhitespace(nodes) {
	const shouldCondense = currentOptions.whitespace !== "preserve";
	let removedWhitespace = false;
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i];
		if (node.type === 2) {
			if (!inPre) {
				if (isAllWhitespace(node.content)) {
					const prev = nodes[i - 1] && nodes[i - 1].type;
					const next = nodes[i + 1] && nodes[i + 1].type;
					if (!prev || !next || shouldCondense && (prev === 3 && (next === 3 || next === 1) || prev === 1 && (next === 3 || next === 1 && hasNewlineChar(node.content)))) {
						removedWhitespace = true;
						nodes[i] = null;
					} else node.content = " ";
				} else if (shouldCondense) node.content = condense(node.content);
			} else node.content = node.content.replace(windowsNewlineRE, "\n");
		}
	}
	return removedWhitespace ? nodes.filter(Boolean) : nodes;
}
function hasNewlineChar(str) {
	for (let i = 0; i < str.length; i++) {
		const c = str.charCodeAt(i);
		if (c === 10 || c === 13) return true;
	}
	return false;
}
function condense(str) {
	let ret = "";
	let prevCharIsWhitespace = false;
	for (let i = 0; i < str.length; i++) if (isWhitespace(str.charCodeAt(i))) {
		if (!prevCharIsWhitespace) {
			ret += " ";
			prevCharIsWhitespace = true;
		}
	} else {
		ret += str[i];
		prevCharIsWhitespace = false;
	}
	return ret;
}
function addNode(node) {
	(stack[0] || currentRoot).children.push(node);
}
function getLoc(start, end) {
	return {
		start: tokenizer.getPos(start),
		end: end == null ? end : tokenizer.getPos(end),
		source: end == null ? end : getSlice(start, end)
	};
}
function cloneLoc(loc) {
	return getLoc(loc.start.offset, loc.end.offset);
}
function setLocEnd(loc, end) {
	loc.end = tokenizer.getPos(end);
	loc.source = getSlice(loc.start.offset, end);
}
function dirToAttr(dir) {
	const attr = {
		type: 6,
		name: dir.rawName,
		nameLoc: getLoc(dir.loc.start.offset, dir.loc.start.offset + dir.rawName.length),
		value: void 0,
		loc: dir.loc
	};
	if (dir.exp) {
		const loc = dir.exp.loc;
		if (loc.end.offset < dir.loc.end.offset) {
			loc.start.offset--;
			loc.start.column--;
			loc.end.offset++;
			loc.end.column++;
		}
		attr.value = {
			type: 2,
			content: dir.exp.content,
			loc
		};
	}
	return attr;
}
function createExp(content, isStatic = false, loc, constType = 0, parseMode = 0) {
	return createSimpleExpression(content, isStatic, loc, constType);
}
function emitError(code, index, message) {
	currentOptions.onError(createCompilerError(code, getLoc(index, index), void 0, message));
}
function reset() {
	tokenizer.reset();
	currentOpenTag = null;
	currentProp = null;
	currentAttrValue = "";
	currentAttrStartIndex = -1;
	currentAttrEndIndex = -1;
	stack.length = 0;
}
function baseParse(input, options) {
	reset();
	currentInput = input;
	currentOptions = extend({}, defaultParserOptions);
	if (options) {
		let key;
		for (key in options) if (options[key] != null) currentOptions[key] = options[key];
	}
	tokenizer.mode = currentOptions.parseMode === "html" ? 1 : currentOptions.parseMode === "sfc" ? 2 : 0;
	tokenizer.inXML = currentOptions.ns === 1 || currentOptions.ns === 2;
	const delimiters = options && options.delimiters;
	if (delimiters) {
		tokenizer.delimiterOpen = toCharCodes(delimiters[0]);
		tokenizer.delimiterClose = toCharCodes(delimiters[1]);
	}
	const root = currentRoot = createRoot([], input);
	tokenizer.parse(currentInput);
	root.loc = getLoc(0, input.length);
	root.children = condenseWhitespace(root.children);
	currentRoot = null;
	return root;
}
function cacheStatic(root, context) {
	walk(root, void 0, context, !!getSingleElementRoot(root));
}
function getSingleElementRoot(root) {
	const children = root.children.filter((x) => x.type !== 3);
	return children.length === 1 && children[0].type === 1 && !isSlotOutlet(children[0]) ? children[0] : null;
}
function walk(node, parent, context, doNotHoistNode = false, inFor = false) {
	const { children } = node;
	const toCache = [];
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (child.type === 1 && child.tagType === 0) {
			const constantType = doNotHoistNode ? 0 : getConstantType(child, context);
			if (constantType > 0) {
				if (constantType >= 2) {
					child.codegenNode.patchFlag = -1;
					toCache.push(child);
					continue;
				}
			} else {
				const codegenNode = child.codegenNode;
				if (codegenNode.type === 13) {
					const flag = codegenNode.patchFlag;
					if ((flag === void 0 || flag === 512 || flag === 1) && getGeneratedPropsConstantType(child, context) >= 2) {
						const props = getNodeProps(child);
						if (props) codegenNode.props = context.hoist(props);
					}
					if (codegenNode.dynamicProps) codegenNode.dynamicProps = context.hoist(codegenNode.dynamicProps);
				}
			}
		} else if (child.type === 12) {
			if ((doNotHoistNode ? 0 : getConstantType(child, context)) >= 2) {
				if (child.codegenNode.type === 14 && child.codegenNode.arguments.length > 0) child.codegenNode.arguments.push("-1");
				toCache.push(child);
				continue;
			}
		}
		if (child.type === 1) {
			const isComponent = child.tagType === 1;
			if (isComponent) context.scopes.vSlot++;
			walk(child, node, context, false, inFor);
			if (isComponent) context.scopes.vSlot--;
		} else if (child.type === 11) walk(child, node, context, child.children.length === 1, true);
		else if (child.type === 9) for (let i2 = 0; i2 < child.branches.length; i2++) walk(child.branches[i2], node, context, child.branches[i2].children.length === 1, inFor);
	}
	let cachedAsArray = false;
	if (toCache.length === children.length && node.type === 1) {
		if (node.tagType === 0 && node.codegenNode && node.codegenNode.type === 13 && isArray(node.codegenNode.children)) {
			node.codegenNode.children = getCacheExpression(createArrayExpression(node.codegenNode.children));
			cachedAsArray = true;
		} else if (node.tagType === 1 && node.codegenNode && node.codegenNode.type === 13 && node.codegenNode.children && !isArray(node.codegenNode.children) && node.codegenNode.children.type === 15) {
			const slot = getSlotNode(node.codegenNode, "default");
			if (slot) {
				slot.returns = getCacheExpression(createArrayExpression(slot.returns));
				cachedAsArray = true;
			}
		} else if (node.tagType === 3 && parent && parent.type === 1 && parent.tagType === 1 && parent.codegenNode && parent.codegenNode.type === 13 && parent.codegenNode.children && !isArray(parent.codegenNode.children) && parent.codegenNode.children.type === 15) {
			const slotName = findDir(node, "slot", true);
			const slot = slotName && slotName.arg && getSlotNode(parent.codegenNode, slotName.arg);
			if (slot) {
				slot.returns = getCacheExpression(createArrayExpression(slot.returns));
				cachedAsArray = true;
			}
		}
	}
	if (!cachedAsArray) for (const child of toCache) child.codegenNode = context.cache(child.codegenNode);
	function getCacheExpression(value) {
		const exp = context.cache(value);
		exp.needArraySpread = true;
		return exp;
	}
	function getSlotNode(node2, name) {
		if (node2.children && !isArray(node2.children) && node2.children.type === 15) {
			const slot = node2.children.properties.find((p) => p.key === name || p.key.content === name);
			return slot && slot.value;
		}
	}
	if (toCache.length && context.transformHoist) context.transformHoist(children, context, node);
}
function getConstantType(node, context) {
	const { constantCache } = context;
	switch (node.type) {
		case 1:
			if (node.tagType !== 0) return 0;
			const cached = constantCache.get(node);
			if (cached !== void 0) return cached;
			const codegenNode = node.codegenNode;
			if (codegenNode.type !== 13) return 0;
			if (codegenNode.isBlock && node.tag !== "svg" && node.tag !== "foreignObject" && node.tag !== "math") return 0;
			if (codegenNode.patchFlag === void 0) {
				let returnType2 = 3;
				const generatedPropsType = getGeneratedPropsConstantType(node, context);
				if (generatedPropsType === 0) {
					constantCache.set(node, 0);
					return 0;
				}
				if (generatedPropsType < returnType2) returnType2 = generatedPropsType;
				for (let i = 0; i < node.children.length; i++) {
					const childType = getConstantType(node.children[i], context);
					if (childType === 0) {
						constantCache.set(node, 0);
						return 0;
					}
					if (childType < returnType2) returnType2 = childType;
				}
				if (returnType2 > 1) for (let i = 0; i < node.props.length; i++) {
					const p = node.props[i];
					if (p.type === 7 && p.name === "bind" && p.exp) {
						const expType = getConstantType(p.exp, context);
						if (expType === 0) {
							constantCache.set(node, 0);
							return 0;
						}
						if (expType < returnType2) returnType2 = expType;
					}
				}
				if (codegenNode.isBlock) {
					for (let i = 0; i < node.props.length; i++) if (node.props[i].type === 7) {
						constantCache.set(node, 0);
						return 0;
					}
					context.removeHelper(OPEN_BLOCK);
					context.removeHelper(getVNodeBlockHelper(context.inSSR, codegenNode.isComponent));
					codegenNode.isBlock = false;
					context.helper(getVNodeHelper(context.inSSR, codegenNode.isComponent));
				}
				constantCache.set(node, returnType2);
				return returnType2;
			} else {
				constantCache.set(node, 0);
				return 0;
			}
		case 2:
		case 3: return 3;
		case 9:
		case 11:
		case 10: return 0;
		case 5:
		case 12: return getConstantType(node.content, context);
		case 4: return node.constType;
		case 8:
			let returnType = 3;
			for (let i = 0; i < node.children.length; i++) {
				const child = node.children[i];
				if (isString(child) || isSymbol(child)) continue;
				const childType = getConstantType(child, context);
				if (childType === 0) return 0;
				else if (childType < returnType) returnType = childType;
			}
			return returnType;
		case 20: return 2;
		default: return 0;
	}
}
function getConstantTypeOfHelperCall(value, context) {
	if (value.type === 14 && !isString(value.callee) && allowHoistedHelperSet.has(value.callee)) {
		const arg = value.arguments[0];
		if (arg.type === 4) return getConstantType(arg, context);
		else if (arg.type === 14) return getConstantTypeOfHelperCall(arg, context);
	}
	return 0;
}
function getGeneratedPropsConstantType(node, context) {
	let returnType = 3;
	const props = getNodeProps(node);
	if (props && props.type === 15) {
		const { properties } = props;
		for (let i = 0; i < properties.length; i++) {
			const { key, value } = properties[i];
			const keyType = getConstantType(key, context);
			if (keyType === 0) return keyType;
			if (keyType < returnType) returnType = keyType;
			let valueType;
			if (value.type === 4) valueType = getConstantType(value, context);
			else if (value.type === 14) valueType = getConstantTypeOfHelperCall(value, context);
			else valueType = 0;
			if (valueType === 0) return valueType;
			if (valueType < returnType) returnType = valueType;
		}
	}
	return returnType;
}
function getNodeProps(node) {
	const codegenNode = node.codegenNode;
	if (codegenNode.type === 13) return codegenNode.props;
}
function createTransformContext(root, { filename = "", prefixIdentifiers = false, hoistStatic = false, hmr = false, cacheHandlers = false, nodeTransforms = [], directiveTransforms = {}, transformHoist = null, isBuiltInComponent = NOOP, isCustomElement = NOOP, expressionPlugins = [], scopeId = null, slotted = true, ssr = false, inSSR = false, ssrCssVars = ``, bindingMetadata = EMPTY_OBJ, inline = false, isTS = false, onError = defaultOnError, onWarn = defaultOnWarn, compatConfig }) {
	const nameMatch = filename.replace(/\?.*$/, "").match(/([^/\\]+)\.\w+$/);
	const context = {
		filename,
		selfName: nameMatch && capitalize(camelize(nameMatch[1])),
		prefixIdentifiers,
		hoistStatic,
		hmr,
		cacheHandlers,
		nodeTransforms,
		directiveTransforms,
		transformHoist,
		isBuiltInComponent,
		isCustomElement,
		expressionPlugins,
		scopeId,
		slotted,
		ssr,
		inSSR,
		ssrCssVars,
		bindingMetadata,
		inline,
		isTS,
		onError,
		onWarn,
		compatConfig,
		root,
		helpers: /* @__PURE__ */ new Map(),
		components: /* @__PURE__ */ new Set(),
		directives: /* @__PURE__ */ new Set(),
		hoists: [],
		imports: [],
		cached: [],
		constantCache: /* @__PURE__ */ new WeakMap(),
		temps: 0,
		identifiers: /* @__PURE__ */ Object.create(null),
		scopes: {
			vFor: 0,
			vSlot: 0,
			vPre: 0,
			vOnce: 0
		},
		parent: null,
		grandParent: null,
		currentNode: root,
		childIndex: 0,
		inVOnce: false,
		helper(name) {
			const count = context.helpers.get(name) || 0;
			context.helpers.set(name, count + 1);
			return name;
		},
		removeHelper(name) {
			const count = context.helpers.get(name);
			if (count) {
				const currentCount = count - 1;
				if (!currentCount) context.helpers.delete(name);
				else context.helpers.set(name, currentCount);
			}
		},
		helperString(name) {
			return `_${helperNameMap[context.helper(name)]}`;
		},
		replaceNode(node) {
			context.parent.children[context.childIndex] = context.currentNode = node;
		},
		removeNode(node) {
			const list = context.parent.children;
			const removalIndex = node ? list.indexOf(node) : context.currentNode ? context.childIndex : -1;
			if (!node || node === context.currentNode) {
				context.currentNode = null;
				context.onNodeRemoved();
			} else if (context.childIndex > removalIndex) {
				context.childIndex--;
				context.onNodeRemoved();
			}
			context.parent.children.splice(removalIndex, 1);
		},
		onNodeRemoved: NOOP,
		addIdentifiers(exp) {},
		removeIdentifiers(exp) {},
		hoist(exp) {
			if (isString(exp)) exp = createSimpleExpression(exp);
			context.hoists.push(exp);
			const identifier = createSimpleExpression(`_hoisted_${context.hoists.length}`, false, exp.loc, 2);
			identifier.hoisted = exp;
			return identifier;
		},
		cache(exp, isVNode = false, inVOnce = false) {
			const cacheExp = createCacheExpression(context.cached.length, exp, isVNode, inVOnce);
			context.cached.push(cacheExp);
			return cacheExp;
		}
	};
	context.filters = /* @__PURE__ */ new Set();
	return context;
}
function transform(root, options) {
	const context = createTransformContext(root, options);
	traverseNode(root, context);
	if (options.hoistStatic) cacheStatic(root, context);
	if (!options.ssr) createRootCodegen(root, context);
	root.helpers = /* @__PURE__ */ new Set([...context.helpers.keys()]);
	root.components = [...context.components];
	root.directives = [...context.directives];
	root.imports = context.imports;
	root.hoists = context.hoists;
	root.temps = context.temps;
	root.cached = context.cached;
	root.transformed = true;
	root.filters = [...context.filters];
}
function createRootCodegen(root, context) {
	const { helper } = context;
	const { children } = root;
	if (children.length === 1) {
		const singleElementRootChild = getSingleElementRoot(root);
		if (singleElementRootChild && singleElementRootChild.codegenNode) {
			const codegenNode = singleElementRootChild.codegenNode;
			if (codegenNode.type === 13) convertToBlock(codegenNode, context);
			root.codegenNode = codegenNode;
		} else root.codegenNode = children[0];
	} else if (children.length > 1) root.codegenNode = createVNodeCall(context, helper(FRAGMENT), void 0, root.children, 64, void 0, void 0, true, void 0, false);
}
function traverseChildren(parent, context) {
	let i = 0;
	const nodeRemoved = () => {
		i--;
	};
	for (; i < parent.children.length; i++) {
		const child = parent.children[i];
		if (isString(child)) continue;
		context.grandParent = context.parent;
		context.parent = parent;
		context.childIndex = i;
		context.onNodeRemoved = nodeRemoved;
		traverseNode(child, context);
	}
}
function traverseNode(node, context) {
	context.currentNode = node;
	const { nodeTransforms } = context;
	const exitFns = [];
	for (let i2 = 0; i2 < nodeTransforms.length; i2++) {
		const onExit = nodeTransforms[i2](node, context);
		if (onExit) {
			if (isArray(onExit)) exitFns.push(...onExit);
			else exitFns.push(onExit);
		}
		if (!context.currentNode) return;
		else node = context.currentNode;
	}
	switch (node.type) {
		case 3:
			if (!context.ssr) context.helper(CREATE_COMMENT);
			break;
		case 5:
			if (!context.ssr) context.helper(TO_DISPLAY_STRING);
			break;
		case 9:
			for (let i2 = 0; i2 < node.branches.length; i2++) traverseNode(node.branches[i2], context);
			break;
		case 10:
		case 11:
		case 1:
		case 0: traverseChildren(node, context);
	}
	context.currentNode = node;
	let i = exitFns.length;
	while (i--) exitFns[i]();
}
function createStructuralDirectiveTransform(name, fn) {
	const matches = isString(name) ? (n) => n === name : (n) => name.test(n);
	return (node, context) => {
		if (node.type === 1) {
			const { props } = node;
			if (node.tagType === 3 && props.some(isVSlot)) return;
			const exitFns = [];
			for (let i = 0; i < props.length; i++) {
				const prop = props[i];
				if (prop.type === 7 && matches(prop.name)) {
					props.splice(i, 1);
					i--;
					const onExit = fn(node, prop, context);
					if (onExit) exitFns.push(onExit);
				}
			}
			return exitFns;
		}
	};
}
function createCodegenContext(ast, { mode = "function", prefixIdentifiers = mode === "module", sourceMap = false, filename = `template.vue.html`, scopeId = null, optimizeImports = false, runtimeGlobalName = `Vue`, runtimeModuleName = `vue`, ssrRuntimeModuleName = "vue/server-renderer", ssr = false, isTS = false, inSSR = false }) {
	const context = {
		mode,
		prefixIdentifiers,
		sourceMap,
		filename,
		scopeId,
		optimizeImports,
		runtimeGlobalName,
		runtimeModuleName,
		ssrRuntimeModuleName,
		ssr,
		isTS,
		inSSR,
		source: ast.source,
		code: ``,
		column: 1,
		line: 1,
		offset: 0,
		indentLevel: 0,
		pure: false,
		map: void 0,
		helper(key) {
			return `_${helperNameMap[key]}`;
		},
		push(code, newlineIndex = -2, node) {
			context.code += code;
		},
		indent() {
			newline(++context.indentLevel);
		},
		deindent(withoutNewLine = false) {
			if (withoutNewLine) --context.indentLevel;
			else newline(--context.indentLevel);
		},
		newline() {
			newline(context.indentLevel);
		}
	};
	function newline(n) {
		context.push("\n" + `  `.repeat(n), 0);
	}
	return context;
}
function generate(ast, options = {}) {
	const context = createCodegenContext(ast, options);
	if (options.onContextCreated) options.onContextCreated(context);
	const { mode, push, prefixIdentifiers, indent, deindent, newline, scopeId, ssr } = context;
	const helpers = Array.from(ast.helpers);
	const hasHelpers = helpers.length > 0;
	const useWithBlock = !prefixIdentifiers && mode !== "module";
	genFunctionPreamble(ast, context);
	push(`function ${ssr ? `ssrRender` : `render`}(${(ssr ? [
		"_ctx",
		"_push",
		"_parent",
		"_attrs"
	] : ["_ctx", "_cache"]).join(", ")}) {`);
	indent();
	if (useWithBlock) {
		push(`with (_ctx) {`);
		indent();
		if (hasHelpers) {
			push(`const { ${helpers.map(aliasHelper).join(", ")} } = _Vue
`, -1);
			newline();
		}
	}
	if (ast.components.length) {
		genAssets(ast.components, "component", context);
		if (ast.directives.length || ast.temps > 0) newline();
	}
	if (ast.directives.length) {
		genAssets(ast.directives, "directive", context);
		if (ast.temps > 0) newline();
	}
	if (ast.filters && ast.filters.length) {
		newline();
		genAssets(ast.filters, "filter", context);
		newline();
	}
	if (ast.temps > 0) {
		push(`let `);
		for (let i = 0; i < ast.temps; i++) push(`${i > 0 ? `, ` : ``}_temp${i}`);
	}
	if (ast.components.length || ast.directives.length || ast.temps) {
		push(`
`, 0);
		newline();
	}
	if (!ssr) push(`return `);
	if (ast.codegenNode) genNode(ast.codegenNode, context);
	else push(`null`);
	if (useWithBlock) {
		deindent();
		push(`}`);
	}
	deindent();
	push(`}`);
	return {
		ast,
		code: context.code,
		preamble: ``,
		map: context.map ? context.map.toJSON() : void 0
	};
}
function genFunctionPreamble(ast, context) {
	const { ssr, prefixIdentifiers, push, newline, runtimeModuleName, runtimeGlobalName, ssrRuntimeModuleName } = context;
	const VueBinding = runtimeGlobalName;
	const helpers = Array.from(ast.helpers);
	if (helpers.length > 0) {
		push(`const _Vue = ${VueBinding}
`, -1);
		if (ast.hoists.length) push(`const { ${[
			CREATE_VNODE,
			CREATE_ELEMENT_VNODE,
			CREATE_COMMENT,
			CREATE_TEXT,
			CREATE_STATIC
		].filter((helper) => helpers.includes(helper)).map(aliasHelper).join(", ")} } = _Vue
`, -1);
	}
	genHoists(ast.hoists, context);
	newline();
	push(`return `);
}
function genAssets(assets, type, { helper, push, newline, isTS }) {
	const resolver = helper(type === "filter" ? RESOLVE_FILTER : type === "component" ? RESOLVE_COMPONENT : RESOLVE_DIRECTIVE);
	for (let i = 0; i < assets.length; i++) {
		let id = assets[i];
		const maybeSelfReference = id.endsWith("__self");
		if (maybeSelfReference) id = id.slice(0, -6);
		push(`const ${toValidAssetId(id, type)} = ${resolver}(${JSON.stringify(id)}${maybeSelfReference ? `, true` : ``})${isTS ? `!` : ``}`);
		if (i < assets.length - 1) newline();
	}
}
function genHoists(hoists, context) {
	if (!hoists.length) return;
	context.pure = true;
	const { push, newline } = context;
	newline();
	for (let i = 0; i < hoists.length; i++) {
		const exp = hoists[i];
		if (exp) {
			push(`const _hoisted_${i + 1} = `);
			genNode(exp, context);
			newline();
		}
	}
	context.pure = false;
}
function genNodeListAsArray(nodes, context) {
	const multilines = nodes.length > 3 || false;
	context.push(`[`);
	multilines && context.indent();
	genNodeList(nodes, context, multilines);
	multilines && context.deindent();
	context.push(`]`);
}
function genNodeList(nodes, context, multilines = false, comma = true) {
	const { push, newline } = context;
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i];
		if (isString(node)) push(node, -3);
		else if (isArray(node)) genNodeListAsArray(node, context);
		else genNode(node, context);
		if (i < nodes.length - 1) {
			if (multilines) {
				comma && push(",");
				newline();
			} else comma && push(", ");
		}
	}
}
function genNode(node, context) {
	if (isString(node)) {
		context.push(node, -3);
		return;
	}
	if (isSymbol(node)) {
		context.push(context.helper(node));
		return;
	}
	switch (node.type) {
		case 1:
		case 9:
		case 11:
			genNode(node.codegenNode, context);
			break;
		case 2:
			genText(node, context);
			break;
		case 4:
			genExpression(node, context);
			break;
		case 5:
			genInterpolation(node, context);
			break;
		case 12:
			genNode(node.codegenNode, context);
			break;
		case 8:
			genCompoundExpression(node, context);
			break;
		case 3:
			genComment(node, context);
			break;
		case 13:
			genVNodeCall(node, context);
			break;
		case 14:
			genCallExpression(node, context);
			break;
		case 15:
			genObjectExpression(node, context);
			break;
		case 17:
			genArrayExpression(node, context);
			break;
		case 18:
			genFunctionExpression(node, context);
			break;
		case 19:
			genConditionalExpression(node, context);
			break;
		case 20:
			genCacheExpression(node, context);
			break;
		case 21: genNodeList(node.body, context, true, false);
	}
}
function genText(node, context) {
	context.push(JSON.stringify(node.content), -3, node);
}
function genExpression(node, context) {
	const { content, isStatic } = node;
	context.push(isStatic ? JSON.stringify(content) : content, -3, node);
}
function genInterpolation(node, context) {
	const { push, helper, pure } = context;
	if (pure) push(PURE_ANNOTATION);
	push(`${helper(TO_DISPLAY_STRING)}(`);
	genNode(node.content, context);
	push(`)`);
}
function genCompoundExpression(node, context) {
	for (let i = 0; i < node.children.length; i++) {
		const child = node.children[i];
		if (isString(child)) context.push(child, -3);
		else genNode(child, context);
	}
}
function genExpressionAsPropertyKey(node, context) {
	const { push } = context;
	if (node.type === 8) {
		push(`[`);
		genCompoundExpression(node, context);
		push(`]`);
	} else if (node.isStatic) push(isSimpleIdentifier(node.content) ? node.content : JSON.stringify(node.content), -2, node);
	else push(`[${node.content}]`, -3, node);
}
function genComment(node, context) {
	const { push, helper, pure } = context;
	if (pure) push(PURE_ANNOTATION);
	push(`${helper(CREATE_COMMENT)}(${JSON.stringify(node.content)})`, -3, node);
}
function genVNodeCall(node, context) {
	const { push, helper, pure } = context;
	const { tag, props, children, patchFlag, dynamicProps, directives, isBlock, disableTracking, isComponent } = node;
	let patchFlagString;
	if (patchFlag) patchFlagString = String(patchFlag);
	if (directives) push(helper(WITH_DIRECTIVES) + `(`);
	if (isBlock) push(`(${helper(OPEN_BLOCK)}(${disableTracking ? `true` : ``}), `);
	if (pure) push(PURE_ANNOTATION);
	push(helper(isBlock ? getVNodeBlockHelper(context.inSSR, isComponent) : getVNodeHelper(context.inSSR, isComponent)) + `(`, -2, node);
	genNodeList(genNullableArgs([
		tag,
		props,
		children,
		patchFlagString,
		dynamicProps
	]), context);
	push(`)`);
	if (isBlock) push(`)`);
	if (directives) {
		push(`, `);
		genNode(directives, context);
		push(`)`);
	}
}
function genNullableArgs(args) {
	let i = args.length;
	while (i--) if (args[i] != null) break;
	return args.slice(0, i + 1).map((arg) => arg || `null`);
}
function genCallExpression(node, context) {
	const { push, helper, pure } = context;
	const callee = isString(node.callee) ? node.callee : helper(node.callee);
	if (pure) push(PURE_ANNOTATION);
	push(callee + `(`, -2, node);
	genNodeList(node.arguments, context);
	push(`)`);
}
function genObjectExpression(node, context) {
	const { push, indent, deindent, newline } = context;
	const { properties } = node;
	if (!properties.length) {
		push(`{}`, -2, node);
		return;
	}
	const multilines = properties.length > 1 || false;
	push(multilines ? `{` : `{ `);
	multilines && indent();
	for (let i = 0; i < properties.length; i++) {
		const { key, value } = properties[i];
		genExpressionAsPropertyKey(key, context);
		push(`: `);
		genNode(value, context);
		if (i < properties.length - 1) {
			push(`,`);
			newline();
		}
	}
	multilines && deindent();
	push(multilines ? `}` : ` }`);
}
function genArrayExpression(node, context) {
	genNodeListAsArray(node.elements, context);
}
function genFunctionExpression(node, context) {
	const { push, indent, deindent } = context;
	const { params, returns, body, newline, isSlot } = node;
	if (isSlot) push(`_${helperNameMap[WITH_CTX]}(`);
	push(`(`, -2, node);
	if (isArray(params)) genNodeList(params, context);
	else if (params) genNode(params, context);
	push(`) => `);
	if (newline || body) {
		push(`{`);
		indent();
	}
	if (returns) {
		if (newline) push(`return `);
		if (isArray(returns)) genNodeListAsArray(returns, context);
		else genNode(returns, context);
	} else if (body) genNode(body, context);
	if (newline || body) {
		deindent();
		push(`}`);
	}
	if (isSlot) {
		if (node.isNonScopedSlot) push(`, undefined, true`);
		push(`)`);
	}
}
function genConditionalExpression(node, context) {
	const { test, consequent, alternate, newline: needNewline } = node;
	const { push, indent, deindent, newline } = context;
	if (test.type === 4) {
		const needsParens = !isSimpleIdentifier(test.content);
		needsParens && push(`(`);
		genExpression(test, context);
		needsParens && push(`)`);
	} else {
		push(`(`);
		genNode(test, context);
		push(`)`);
	}
	needNewline && indent();
	context.indentLevel++;
	needNewline || push(` `);
	push(`? `);
	genNode(consequent, context);
	context.indentLevel--;
	needNewline && newline();
	needNewline || push(` `);
	push(`: `);
	const isNested = alternate.type === 19;
	if (!isNested) context.indentLevel++;
	genNode(alternate, context);
	if (!isNested) context.indentLevel--;
	needNewline && deindent(true);
}
function genCacheExpression(node, context) {
	const { push, helper, indent, deindent, newline } = context;
	const { needPauseTracking, needArraySpread } = node;
	if (needArraySpread) push(`[...(`);
	push(`_cache[${node.index}] || (`);
	if (needPauseTracking) {
		indent();
		push(`${helper(SET_BLOCK_TRACKING)}(-1`);
		if (node.inVOnce) push(`, true`);
		push(`),`);
		newline();
		push(`(`);
	}
	push(`_cache[${node.index}] = `);
	genNode(node.value, context);
	if (needPauseTracking) {
		push(`).cacheIndex = ${node.index},`);
		newline();
		push(`${helper(SET_BLOCK_TRACKING)}(1),`);
		newline();
		push(`_cache[${node.index}]`);
		deindent();
	}
	push(`)`);
	if (needArraySpread) push(`)]`);
}
function processExpression(node, context, asParams = false, asRawStatements = false, localVars = Object.create(context.identifiers)) {
	return node;
}
function stringifyExpression(exp) {
	if (isString(exp)) return exp;
	else if (exp.type === 4) return exp.content;
	else return exp.children.map(stringifyExpression).join("");
}
function processIf(node, dir, context, processCodegen) {
	if (dir.name !== "else" && (!dir.exp || !dir.exp.content.trim())) {
		const loc = dir.exp ? dir.exp.loc : node.loc;
		context.onError(createCompilerError(28, dir.loc));
		dir.exp = createSimpleExpression(`true`, false, loc);
	}
	if (dir.name === "if") {
		const branch = createIfBranch(node, dir);
		const ifNode = {
			type: 9,
			loc: cloneLoc(node.loc),
			branches: [branch]
		};
		context.replaceNode(ifNode);
		if (processCodegen) return processCodegen(ifNode, branch, true);
	} else {
		const siblings = context.parent.children;
		let i = siblings.indexOf(node);
		while (i-- >= -1) {
			const sibling = siblings[i];
			if (sibling && isCommentOrWhitespace(sibling)) {
				context.removeNode(sibling);
				continue;
			}
			if (sibling && sibling.type === 9) {
				if ((dir.name === "else-if" || dir.name === "else") && sibling.branches[sibling.branches.length - 1].condition === void 0) context.onError(createCompilerError(30, node.loc));
				context.removeNode();
				const branch = createIfBranch(node, dir);
				sibling.branches.push(branch);
				const onExit = processCodegen && processCodegen(sibling, branch, false);
				traverseNode(branch, context);
				if (onExit) onExit();
				context.currentNode = null;
			} else context.onError(createCompilerError(30, node.loc));
			break;
		}
	}
}
function createIfBranch(node, dir) {
	const isTemplateIf = node.tagType === 3;
	return {
		type: 10,
		loc: node.loc,
		condition: dir.name === "else" ? void 0 : dir.exp,
		children: isTemplateIf && !findDir(node, "for") ? node.children : [node],
		userKey: findProp(node, `key`),
		isTemplateIf
	};
}
function createCodegenNodeForBranch(branch, keyIndex, context) {
	if (branch.condition) return createConditionalExpression(branch.condition, createChildrenCodegenNode(branch, keyIndex, context), createCallExpression(context.helper(CREATE_COMMENT), ["\"\"", "true"]));
	else return createChildrenCodegenNode(branch, keyIndex, context);
}
function createChildrenCodegenNode(branch, keyIndex, context) {
	const { helper } = context;
	const keyProperty = createObjectProperty(`key`, createSimpleExpression(`${keyIndex}`, false, locStub, 2));
	const { children } = branch;
	const firstChild = children[0];
	if (children.length !== 1 || firstChild.type !== 1) {
		if (children.length === 1 && firstChild.type === 11) {
			const vnodeCall = firstChild.codegenNode;
			injectProp(vnodeCall, keyProperty, context);
			return vnodeCall;
		} else return createVNodeCall(context, helper(FRAGMENT), createObjectExpression([keyProperty]), children, 64, void 0, void 0, true, false, false, branch.loc);
	} else {
		const ret = firstChild.codegenNode;
		const vnodeCall = getMemoedVNodeCall(ret);
		if (vnodeCall.type === 13) convertToBlock(vnodeCall, context);
		injectProp(vnodeCall, keyProperty, context);
		return ret;
	}
}
function getParentCondition(node) {
	while (true) if (node.type === 19) {
		if (node.alternate.type === 19) node = node.alternate;
		else return node;
	} else if (node.type === 20) node = node.value;
}
function processFor(node, dir, context, processCodegen) {
	if (!dir.exp) {
		context.onError(createCompilerError(31, dir.loc));
		return;
	}
	const parseResult = dir.forParseResult;
	if (!parseResult) {
		context.onError(createCompilerError(32, dir.loc));
		return;
	}
	finalizeForParseResult(parseResult, context);
	const { addIdentifiers, removeIdentifiers, scopes } = context;
	const { source, value, key, index } = parseResult;
	const forNode = {
		type: 11,
		loc: dir.loc,
		source,
		valueAlias: value,
		keyAlias: key,
		objectIndexAlias: index,
		parseResult,
		children: isTemplateNode(node) ? node.children : [node]
	};
	context.replaceNode(forNode);
	scopes.vFor++;
	const onExit = processCodegen && processCodegen(forNode);
	return () => {
		scopes.vFor--;
		if (onExit) onExit();
	};
}
function finalizeForParseResult(result, context) {
	if (result.finalized) return;
	result.finalized = true;
}
function createForLoopParams({ value, key, index }, memoArgs = []) {
	return createParamsList([
		value,
		key,
		index,
		...memoArgs
	]);
}
function createParamsList(args) {
	let i = args.length;
	while (i--) if (args[i]) break;
	return args.slice(0, i + 1).map((arg, i2) => arg || createSimpleExpression(`_`.repeat(i2 + 1), false));
}
function buildSlots(node, context, buildSlotFn = buildClientSlotFn) {
	context.helper(WITH_CTX);
	const { children, loc } = node;
	const slotsProperties = [];
	const dynamicSlots = [];
	let hasDynamicSlots = context.scopes.vSlot > 0 || context.scopes.vFor > 0;
	const onComponentSlot = findDir(node, "slot", true);
	if (onComponentSlot) {
		const { arg, exp } = onComponentSlot;
		if (arg && !isStaticExp(arg)) hasDynamicSlots = true;
		slotsProperties.push(createObjectProperty(arg || createSimpleExpression("default", true), buildSlotFn(exp, void 0, children, loc)));
	}
	let hasTemplateSlots = false;
	let hasNamedDefaultSlot = false;
	const implicitDefaultChildren = [];
	const seenSlotNames = /* @__PURE__ */ new Set();
	let conditionalBranchIndex = 0;
	for (let i = 0; i < children.length; i++) {
		const slotElement = children[i];
		let slotDir;
		if (!isTemplateNode(slotElement) || !(slotDir = findDir(slotElement, "slot", true))) {
			if (slotElement.type !== 3) implicitDefaultChildren.push(slotElement);
			continue;
		}
		if (onComponentSlot) {
			context.onError(createCompilerError(37, slotDir.loc));
			break;
		}
		hasTemplateSlots = true;
		const { children: slotChildren, loc: slotLoc } = slotElement;
		const { arg: slotName = createSimpleExpression(`default`, true), exp: slotProps, loc: dirLoc } = slotDir;
		let staticSlotName;
		if (isStaticExp(slotName)) staticSlotName = slotName ? slotName.content : `default`;
		else hasDynamicSlots = true;
		const vFor = findDir(slotElement, "for");
		const slotFunction = buildSlotFn(slotProps, vFor, slotChildren, slotLoc);
		let vIf;
		let vElse;
		if (vIf = findDir(slotElement, "if")) {
			hasDynamicSlots = true;
			dynamicSlots.push(createConditionalExpression(vIf.exp, buildDynamicSlot(slotName, slotFunction, conditionalBranchIndex++), defaultFallback));
		} else if (vElse = findDir(slotElement, /^else(?:-if)?$/, true)) {
			let j = i;
			let prev;
			while (j--) {
				prev = children[j];
				if (!isCommentOrWhitespace(prev)) break;
			}
			if (prev && isTemplateNode(prev) && findDir(prev, /^(?:else-)?if$/)) {
				let conditional = dynamicSlots[dynamicSlots.length - 1];
				while (conditional.alternate.type === 19) conditional = conditional.alternate;
				conditional.alternate = vElse.exp ? createConditionalExpression(vElse.exp, buildDynamicSlot(slotName, slotFunction, conditionalBranchIndex++), defaultFallback) : buildDynamicSlot(slotName, slotFunction, conditionalBranchIndex++);
			} else context.onError(createCompilerError(30, vElse.loc));
		} else if (vFor) {
			hasDynamicSlots = true;
			const parseResult = vFor.forParseResult;
			if (parseResult) {
				finalizeForParseResult(parseResult, context);
				dynamicSlots.push(createCallExpression(context.helper(RENDER_LIST), [parseResult.source, createFunctionExpression(createForLoopParams(parseResult), buildDynamicSlot(slotName, slotFunction), true)]));
			} else context.onError(createCompilerError(32, vFor.loc));
		} else {
			if (staticSlotName) {
				if (seenSlotNames.has(staticSlotName)) {
					context.onError(createCompilerError(38, dirLoc));
					continue;
				}
				seenSlotNames.add(staticSlotName);
				if (staticSlotName === "default") hasNamedDefaultSlot = true;
			}
			slotsProperties.push(createObjectProperty(slotName, slotFunction));
		}
	}
	if (!onComponentSlot) {
		const buildDefaultSlotProperty = (props, children2) => {
			const fn = buildSlotFn(props, void 0, children2, loc);
			if (context.compatConfig) fn.isNonScopedSlot = true;
			return createObjectProperty(`default`, fn);
		};
		if (!hasTemplateSlots) slotsProperties.push(buildDefaultSlotProperty(void 0, children));
		else if (implicitDefaultChildren.length && !implicitDefaultChildren.every(isWhitespaceText)) {
			if (hasNamedDefaultSlot) context.onError(createCompilerError(39, implicitDefaultChildren[0].loc));
			else slotsProperties.push(buildDefaultSlotProperty(void 0, implicitDefaultChildren));
		}
	}
	const slotFlag = hasDynamicSlots ? 2 : hasForwardedSlots(node.children) ? 3 : 1;
	let slots = createObjectExpression(slotsProperties.concat(createObjectProperty(`_`, createSimpleExpression(slotFlag + ``, false))), loc);
	if (dynamicSlots.length) slots = createCallExpression(context.helper(CREATE_SLOTS), [slots, createArrayExpression(dynamicSlots)]);
	return {
		slots,
		hasDynamicSlots
	};
}
function buildDynamicSlot(name, fn, index) {
	const props = [createObjectProperty(`name`, name), createObjectProperty(`fn`, fn)];
	if (index != null) props.push(createObjectProperty(`key`, createSimpleExpression(String(index), true)));
	return createObjectExpression(props);
}
function hasForwardedSlots(children) {
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		switch (child.type) {
			case 1:
				if (child.tagType === 2 || hasForwardedSlots(child.children)) return true;
				break;
			case 9:
				if (hasForwardedSlots(child.branches)) return true;
				break;
			case 10:
			case 11: if (hasForwardedSlots(child.children)) return true;
		}
	}
	return false;
}
function resolveComponentType(node, context, ssr = false) {
	let { tag } = node;
	const isExplicitDynamic = isComponentTag(tag);
	const isProp = findProp(node, "is", false, true);
	if (isProp) {
		if (isExplicitDynamic || isCompatEnabled("COMPILER_IS_ON_ELEMENT", context)) {
			let exp;
			if (isProp.type === 6) exp = isProp.value && createSimpleExpression(isProp.value.content, true);
			else {
				exp = isProp.exp;
				if (!exp) exp = createSimpleExpression(`is`, false, isProp.arg.loc);
			}
			if (exp) return createCallExpression(context.helper(RESOLVE_DYNAMIC_COMPONENT), [exp]);
		} else if (isProp.type === 6 && isProp.value.content.startsWith("vue:")) tag = isProp.value.content.slice(4);
	}
	const builtIn = isCoreComponent(tag) || context.isBuiltInComponent(tag);
	if (builtIn) {
		if (!ssr) context.helper(builtIn);
		return builtIn;
	}
	context.helper(RESOLVE_COMPONENT);
	context.components.add(tag);
	return toValidAssetId(tag, `component`);
}
function buildProps(node, context, props = node.props, isComponent, isDynamicComponent, ssr = false) {
	const { tag, loc: elementLoc, children } = node;
	let properties = [];
	const mergeArgs = [];
	const runtimeDirectives = [];
	const hasChildren = children.length > 0;
	let shouldUseBlock = false;
	let patchFlag = 0;
	let hasRef = false;
	let hasClassBinding = false;
	let hasStyleBinding = false;
	let hasHydrationEventBinding = false;
	let hasDynamicKeys = false;
	let hasVnodeHook = false;
	const dynamicPropNames = [];
	const pushMergeArg = (arg) => {
		if (properties.length) {
			mergeArgs.push(createObjectExpression(dedupeProperties(properties), elementLoc));
			properties = [];
		}
		if (arg) mergeArgs.push(arg);
	};
	const pushRefVForMarker = () => {
		if (context.scopes.vFor > 0) properties.push(createObjectProperty(createSimpleExpression("ref_for", true), createSimpleExpression("true")));
	};
	const analyzePatchFlag = ({ key, value }) => {
		if (isStaticExp(key)) {
			const name = key.content;
			const isEventHandler = isOn(name);
			if (isEventHandler && (!isComponent || isDynamicComponent) && name.toLowerCase() !== "onclick" && name !== "onUpdate:modelValue" && !isReservedProp(name)) hasHydrationEventBinding = true;
			if (isEventHandler && isReservedProp(name)) hasVnodeHook = true;
			if (isEventHandler && value.type === 14) value = value.arguments[0];
			if (value.type === 20 || (value.type === 4 || value.type === 8) && getConstantType(value, context) > 0) return;
			if (name === "ref") hasRef = true;
			else if (name === "class") hasClassBinding = true;
			else if (name === "style") hasStyleBinding = true;
			else if (name !== "key" && !dynamicPropNames.includes(name)) dynamicPropNames.push(name);
			if (isComponent && (name === "class" || name === "style") && !dynamicPropNames.includes(name)) dynamicPropNames.push(name);
		} else hasDynamicKeys = true;
	};
	for (let i = 0; i < props.length; i++) {
		const prop = props[i];
		if (prop.type === 6) {
			const { loc, name, nameLoc, value } = prop;
			let isStatic = true;
			if (name === "ref") {
				hasRef = true;
				pushRefVForMarker();
			}
			if (name === "is" && (isComponentTag(tag) || value && value.content.startsWith("vue:") || isCompatEnabled("COMPILER_IS_ON_ELEMENT", context))) continue;
			properties.push(createObjectProperty(createSimpleExpression(name, true, nameLoc), createSimpleExpression(value ? value.content : "", isStatic, value ? value.loc : loc)));
		} else {
			const { name, arg, exp, loc, modifiers } = prop;
			const isVBind = name === "bind";
			const isVOn = name === "on";
			if (name === "slot") {
				if (!isComponent) context.onError(createCompilerError(40, loc));
				continue;
			}
			if (name === "once" || name === "memo") continue;
			if (name === "is" || isVBind && isStaticArgOf(arg, "is") && (isComponentTag(tag) || isCompatEnabled("COMPILER_IS_ON_ELEMENT", context))) continue;
			if (isVOn && ssr) continue;
			if (isVBind && isStaticArgOf(arg, "key") || isVOn && hasChildren && isStaticArgOf(arg, "vue:before-update")) shouldUseBlock = true;
			if (isVBind && isStaticArgOf(arg, "ref")) pushRefVForMarker();
			if (!arg && (isVBind || isVOn)) {
				hasDynamicKeys = true;
				if (exp) {
					if (isVBind) {
						pushMergeArg();
						if (isCompatEnabled("COMPILER_V_BIND_OBJECT_ORDER", context)) {
							mergeArgs.unshift(exp);
							continue;
						}
						pushRefVForMarker();
						pushMergeArg();
						mergeArgs.push(exp);
					} else pushMergeArg({
						type: 14,
						loc,
						callee: context.helper(TO_HANDLERS),
						arguments: isComponent ? [exp] : [exp, `true`]
					});
				} else context.onError(createCompilerError(isVBind ? 34 : 35, loc));
				continue;
			}
			if (isVBind && modifiers.some((mod) => mod.content === "prop")) patchFlag |= 32;
			const directiveTransform = context.directiveTransforms[name];
			if (directiveTransform) {
				const { props: props2, needRuntime } = directiveTransform(prop, node, context);
				!ssr && props2.forEach(analyzePatchFlag);
				if (isVOn && arg && !isStaticExp(arg)) pushMergeArg(createObjectExpression(props2, elementLoc));
				else properties.push(...props2);
				if (needRuntime) {
					runtimeDirectives.push(prop);
					if (isSymbol(needRuntime)) directiveImportMap.set(prop, needRuntime);
				}
			} else if (!isBuiltInDirective(name)) {
				runtimeDirectives.push(prop);
				if (hasChildren) shouldUseBlock = true;
			}
		}
	}
	let propsExpression = void 0;
	if (mergeArgs.length) {
		pushMergeArg();
		if (mergeArgs.length > 1) propsExpression = createCallExpression(context.helper(MERGE_PROPS), mergeArgs, elementLoc);
		else propsExpression = mergeArgs[0];
	} else if (properties.length) propsExpression = createObjectExpression(dedupeProperties(properties), elementLoc);
	if (hasDynamicKeys) patchFlag |= 16;
	else {
		if (hasClassBinding && !isComponent) patchFlag |= 2;
		if (hasStyleBinding && !isComponent) patchFlag |= 4;
		if (dynamicPropNames.length) patchFlag |= 8;
		if (hasHydrationEventBinding) patchFlag |= 32;
	}
	if (!shouldUseBlock && (patchFlag === 0 || patchFlag === 32) && (hasRef || hasVnodeHook || runtimeDirectives.length > 0)) patchFlag |= 512;
	if (!context.inSSR && propsExpression) switch (propsExpression.type) {
		case 15:
			let classKeyIndex = -1;
			let styleKeyIndex = -1;
			let hasDynamicKey = false;
			for (let i = 0; i < propsExpression.properties.length; i++) {
				const key = propsExpression.properties[i].key;
				if (isStaticExp(key)) {
					if (key.content === "class") classKeyIndex = i;
					else if (key.content === "style") styleKeyIndex = i;
				} else if (!key.isHandlerKey) hasDynamicKey = true;
			}
			const classProp = propsExpression.properties[classKeyIndex];
			const styleProp = propsExpression.properties[styleKeyIndex];
			if (!hasDynamicKey) {
				if (classProp && !isStaticExp(classProp.value)) classProp.value = createCallExpression(context.helper(NORMALIZE_CLASS), [classProp.value]);
				if (styleProp && (hasStyleBinding || styleProp.value.type === 4 && styleProp.value.content.trim()[0] === `[` || styleProp.value.type === 17)) styleProp.value = createCallExpression(context.helper(NORMALIZE_STYLE), [styleProp.value]);
			} else propsExpression = createCallExpression(context.helper(NORMALIZE_PROPS), [propsExpression]);
			break;
		case 14: break;
		default: propsExpression = createCallExpression(context.helper(NORMALIZE_PROPS), [createCallExpression(context.helper(GUARD_REACTIVE_PROPS), [propsExpression])]);
	}
	return {
		props: propsExpression,
		directives: runtimeDirectives,
		patchFlag,
		dynamicPropNames,
		shouldUseBlock
	};
}
function dedupeProperties(properties) {
	const knownProps = /* @__PURE__ */ new Map();
	const deduped = [];
	for (let i = 0; i < properties.length; i++) {
		const prop = properties[i];
		if (prop.key.type === 8 || !prop.key.isStatic) {
			deduped.push(prop);
			continue;
		}
		const name = prop.key.content;
		const existing = knownProps.get(name);
		if (existing) {
			if (name === "style" || name === "class" || isOn(name)) mergeAsArray(existing, prop);
		} else {
			knownProps.set(name, prop);
			deduped.push(prop);
		}
	}
	return deduped;
}
function mergeAsArray(existing, incoming) {
	if (existing.value.type === 17) existing.value.elements.push(incoming.value);
	else existing.value = createArrayExpression([existing.value, incoming.value], existing.loc);
}
function buildDirectiveArgs(dir, context) {
	const dirArgs = [];
	const runtime = directiveImportMap.get(dir);
	if (runtime) dirArgs.push(context.helperString(runtime));
	else {
		context.helper(RESOLVE_DIRECTIVE);
		context.directives.add(dir.name);
		dirArgs.push(toValidAssetId(dir.name, `directive`));
	}
	const { loc } = dir;
	if (dir.exp) dirArgs.push(dir.exp);
	if (dir.arg) {
		if (!dir.exp) dirArgs.push(`void 0`);
		dirArgs.push(dir.arg);
	}
	if (Object.keys(dir.modifiers).length) {
		if (!dir.arg) {
			if (!dir.exp) dirArgs.push(`void 0`);
			dirArgs.push(`void 0`);
		}
		const trueExpression = createSimpleExpression(`true`, false, loc);
		dirArgs.push(createObjectExpression(dir.modifiers.map((modifier) => createObjectProperty(modifier, trueExpression)), loc));
	}
	return createArrayExpression(dirArgs, dir.loc);
}
function stringifyDynamicPropNames(props) {
	let propsNamesString = `[`;
	for (let i = 0, l = props.length; i < l; i++) {
		propsNamesString += JSON.stringify(props[i]);
		if (i < l - 1) propsNamesString += ", ";
	}
	return propsNamesString + `]`;
}
function isComponentTag(tag) {
	return tag === "component" || tag === "Component";
}
function processSlotOutlet(node, context) {
	let slotName = `"default"`;
	let slotProps = void 0;
	const nonNameProps = [];
	for (let i = 0; i < node.props.length; i++) {
		const p = node.props[i];
		if (p.type === 6) {
			if (p.value) {
				if (p.name === "name") slotName = JSON.stringify(p.value.content);
				else {
					p.name = camelize(p.name);
					nonNameProps.push(p);
				}
			}
		} else if (p.name === "bind" && isStaticArgOf(p.arg, "name")) {
			if (p.exp) slotName = p.exp;
			else if (p.arg && p.arg.type === 4) slotName = p.exp = createSimpleExpression(camelize(p.arg.content), false, p.arg.loc);
		} else {
			if (p.name === "bind" && p.arg && isStaticExp(p.arg)) p.arg.content = camelize(p.arg.content);
			nonNameProps.push(p);
		}
	}
	if (nonNameProps.length > 0) {
		const { props, directives } = buildProps(node, context, nonNameProps, false, false);
		slotProps = props;
		if (directives.length) context.onError(createCompilerError(36, directives[0].loc));
	}
	return {
		slotName,
		slotProps
	};
}
function createTransformProps(props = []) {
	return { props };
}
function rewriteFilter(node, context) {
	if (node.type === 4) parseFilter(node, context);
	else for (let i = 0; i < node.children.length; i++) {
		const child = node.children[i];
		if (typeof child !== "object") continue;
		if (child.type === 4) parseFilter(child, context);
		else if (child.type === 8) rewriteFilter(node, context);
		else if (child.type === 5) rewriteFilter(child.content, context);
	}
}
function parseFilter(node, context) {
	const exp = node.content;
	let inSingle = false;
	let inDouble = false;
	let inTemplateString = false;
	let inRegex = false;
	let curly = 0;
	let square = 0;
	let paren = 0;
	let lastFilterIndex = 0;
	let c, prev, i, expression, filters = [];
	for (i = 0; i < exp.length; i++) {
		prev = c;
		c = exp.charCodeAt(i);
		if (inSingle) {
			if (c === 39 && prev !== 92) inSingle = false;
		} else if (inDouble) {
			if (c === 34 && prev !== 92) inDouble = false;
		} else if (inTemplateString) {
			if (c === 96 && prev !== 92) inTemplateString = false;
		} else if (inRegex) {
			if (c === 47 && prev !== 92) inRegex = false;
		} else if (c === 124 && exp.charCodeAt(i + 1) !== 124 && exp.charCodeAt(i - 1) !== 124 && !curly && !square && !paren) {
			if (expression === void 0) {
				lastFilterIndex = i + 1;
				expression = exp.slice(0, i).trim();
			} else pushFilter();
		} else {
			switch (c) {
				case 34:
					inDouble = true;
					break;
				case 39:
					inSingle = true;
					break;
				case 96:
					inTemplateString = true;
					break;
				case 40:
					paren++;
					break;
				case 41:
					paren--;
					break;
				case 91:
					square++;
					break;
				case 93:
					square--;
					break;
				case 123:
					curly++;
					break;
				case 125: curly--;
			}
			if (c === 47) {
				let j = i - 1;
				let p;
				for (; j >= 0; j--) {
					p = exp.charAt(j);
					if (p !== " ") break;
				}
				if (!p || !validDivisionCharRE.test(p)) inRegex = true;
			}
		}
	}
	if (expression === void 0) expression = exp.slice(0, i).trim();
	else if (lastFilterIndex !== 0) pushFilter();
	function pushFilter() {
		filters.push(exp.slice(lastFilterIndex, i).trim());
		lastFilterIndex = i + 1;
	}
	if (filters.length) {
		for (i = 0; i < filters.length; i++) expression = wrapFilter(expression, filters[i], context);
		node.content = expression;
		node.ast = void 0;
	}
}
function wrapFilter(exp, filter, context) {
	context.helper(RESOLVE_FILTER);
	const i = filter.indexOf("(");
	if (i < 0) {
		context.filters.add(filter);
		return `${toValidAssetId(filter, "filter")}(${exp})`;
	} else {
		const name = filter.slice(0, i);
		const args = filter.slice(i + 1);
		context.filters.add(name);
		return `${toValidAssetId(name, "filter")}(${exp}${args !== ")" ? "," + args : args}`;
	}
}
function getBaseTransformPreset(prefixIdentifiers) {
	return [[
		transformVBindShorthand,
		transformOnce,
		transformIf,
		transformMemo,
		transformFor,
		...[transformFilter],
		...[],
		transformSlotOutlet,
		transformElement,
		trackSlotScopes,
		transformText
	], {
		on: transformOn$1,
		bind: transformBind,
		model: transformModel$1
	}];
}
function baseCompile(source, options = {}) {
	const onError = options.onError || defaultOnError;
	const isModuleMode = options.mode === "module";
	if (options.prefixIdentifiers === true) onError(createCompilerError(48));
	else if (isModuleMode) onError(createCompilerError(49));
	const prefixIdentifiers = false;
	if (options.cacheHandlers) onError(createCompilerError(50));
	if (options.scopeId && !isModuleMode) onError(createCompilerError(51));
	const resolvedOptions = extend({}, options, { prefixIdentifiers });
	const ast = isString(source) ? baseParse(source, resolvedOptions) : source;
	const [nodeTransforms, directiveTransforms] = getBaseTransformPreset();
	transform(ast, extend({}, resolvedOptions, {
		nodeTransforms: [...nodeTransforms, ...options.nodeTransforms || []],
		directiveTransforms: extend({}, directiveTransforms, options.directiveTransforms || {})
	}));
	return generate(ast, resolvedOptions);
}
var FRAGMENT, TELEPORT, SUSPENSE, KEEP_ALIVE, BASE_TRANSITION, OPEN_BLOCK, CREATE_BLOCK, CREATE_ELEMENT_BLOCK, CREATE_VNODE, CREATE_ELEMENT_VNODE, CREATE_COMMENT, CREATE_TEXT, CREATE_STATIC, RESOLVE_COMPONENT, RESOLVE_DYNAMIC_COMPONENT, RESOLVE_DIRECTIVE, RESOLVE_FILTER, WITH_DIRECTIVES, RENDER_LIST, RENDER_SLOT, CREATE_SLOTS, TO_DISPLAY_STRING, MERGE_PROPS, NORMALIZE_CLASS, NORMALIZE_STYLE, NORMALIZE_PROPS, GUARD_REACTIVE_PROPS, TO_HANDLERS, CAMELIZE, CAPITALIZE, TO_HANDLER_KEY, SET_BLOCK_TRACKING, PUSH_SCOPE_ID, POP_SCOPE_ID, WITH_CTX, UNREF, IS_REF, WITH_MEMO, IS_MEMO_SAME, helperNameMap, Namespaces, NodeTypes, ElementTypes, ConstantTypes, locStub, defaultDelimitersOpen, defaultDelimitersClose, Sequences, Tokenizer, CompilerDeprecationTypes, deprecationData, ErrorCodes, errorMessages, isFunctionType, isStaticProperty, isStaticPropertyKey, TS_NODE_TYPES, isStaticExp, nonIdentifierRE, isSimpleIdentifier, validFirstIdentCharRE, validIdentCharRE, whitespaceRE, getExpSource, isMemberExpressionBrowser, isMemberExpressionNode, isMemberExpression, fnExpRE, isFnExpressionBrowser, isFnExpressionNode, isFnExpression, propsHelperSet, forAliasRE, defaultParserOptions, currentOptions, currentRoot, currentInput, currentOpenTag, currentProp, currentAttrValue, currentAttrStartIndex, currentAttrEndIndex, inPre, inVPre, currentVPreBoundary, stack, tokenizer, forIteratorRE, stripParensRE, specialTemplateDir, windowsNewlineRE, allowHoistedHelperSet, PURE_ANNOTATION, aliasHelper, transformExpression, transformIf, transformFor, defaultFallback, trackSlotScopes, trackVForSlotScopes, buildClientSlotFn, directiveImportMap, transformElement, transformSlotOutlet, transformOn$1, transformBind, injectPrefix, transformText, seen$1, transformOnce, transformModel$1, validDivisionCharRE, transformFilter, seen, transformMemo, transformVBindShorthand, BindingTypes, noopDirectiveTransform;
var init_compiler_core_esm_bundler = __esmMin((() => {
	init_shared_esm_bundler();
	FRAGMENT = /* @__PURE__ */ Symbol(``);
	TELEPORT = /* @__PURE__ */ Symbol(``);
	SUSPENSE = /* @__PURE__ */ Symbol(``);
	KEEP_ALIVE = /* @__PURE__ */ Symbol(``);
	BASE_TRANSITION = /* @__PURE__ */ Symbol(``);
	OPEN_BLOCK = /* @__PURE__ */ Symbol(``);
	CREATE_BLOCK = /* @__PURE__ */ Symbol(``);
	CREATE_ELEMENT_BLOCK = /* @__PURE__ */ Symbol(``);
	CREATE_VNODE = /* @__PURE__ */ Symbol(``);
	CREATE_ELEMENT_VNODE = /* @__PURE__ */ Symbol(``);
	CREATE_COMMENT = /* @__PURE__ */ Symbol(``);
	CREATE_TEXT = /* @__PURE__ */ Symbol(``);
	CREATE_STATIC = /* @__PURE__ */ Symbol(``);
	RESOLVE_COMPONENT = /* @__PURE__ */ Symbol(``);
	RESOLVE_DYNAMIC_COMPONENT = /* @__PURE__ */ Symbol(``);
	RESOLVE_DIRECTIVE = /* @__PURE__ */ Symbol(``);
	RESOLVE_FILTER = /* @__PURE__ */ Symbol(``);
	WITH_DIRECTIVES = /* @__PURE__ */ Symbol(``);
	RENDER_LIST = /* @__PURE__ */ Symbol(``);
	RENDER_SLOT = /* @__PURE__ */ Symbol(``);
	CREATE_SLOTS = /* @__PURE__ */ Symbol(``);
	TO_DISPLAY_STRING = /* @__PURE__ */ Symbol(``);
	MERGE_PROPS = /* @__PURE__ */ Symbol(``);
	NORMALIZE_CLASS = /* @__PURE__ */ Symbol(``);
	NORMALIZE_STYLE = /* @__PURE__ */ Symbol(``);
	NORMALIZE_PROPS = /* @__PURE__ */ Symbol(``);
	GUARD_REACTIVE_PROPS = /* @__PURE__ */ Symbol(``);
	TO_HANDLERS = /* @__PURE__ */ Symbol(``);
	CAMELIZE = /* @__PURE__ */ Symbol(``);
	CAPITALIZE = /* @__PURE__ */ Symbol(``);
	TO_HANDLER_KEY = /* @__PURE__ */ Symbol(``);
	SET_BLOCK_TRACKING = /* @__PURE__ */ Symbol(``);
	PUSH_SCOPE_ID = /* @__PURE__ */ Symbol(``);
	POP_SCOPE_ID = /* @__PURE__ */ Symbol(``);
	WITH_CTX = /* @__PURE__ */ Symbol(``);
	UNREF = /* @__PURE__ */ Symbol(``);
	IS_REF = /* @__PURE__ */ Symbol(``);
	WITH_MEMO = /* @__PURE__ */ Symbol(``);
	IS_MEMO_SAME = /* @__PURE__ */ Symbol(``);
	helperNameMap = {
		[FRAGMENT]: `Fragment`,
		[TELEPORT]: `Teleport`,
		[SUSPENSE]: `Suspense`,
		[KEEP_ALIVE]: `KeepAlive`,
		[BASE_TRANSITION]: `BaseTransition`,
		[OPEN_BLOCK]: `openBlock`,
		[CREATE_BLOCK]: `createBlock`,
		[CREATE_ELEMENT_BLOCK]: `createElementBlock`,
		[CREATE_VNODE]: `createVNode`,
		[CREATE_ELEMENT_VNODE]: `createElementVNode`,
		[CREATE_COMMENT]: `createCommentVNode`,
		[CREATE_TEXT]: `createTextVNode`,
		[CREATE_STATIC]: `createStaticVNode`,
		[RESOLVE_COMPONENT]: `resolveComponent`,
		[RESOLVE_DYNAMIC_COMPONENT]: `resolveDynamicComponent`,
		[RESOLVE_DIRECTIVE]: `resolveDirective`,
		[RESOLVE_FILTER]: `resolveFilter`,
		[WITH_DIRECTIVES]: `withDirectives`,
		[RENDER_LIST]: `renderList`,
		[RENDER_SLOT]: `renderSlot`,
		[CREATE_SLOTS]: `createSlots`,
		[TO_DISPLAY_STRING]: `toDisplayString`,
		[MERGE_PROPS]: `mergeProps`,
		[NORMALIZE_CLASS]: `normalizeClass`,
		[NORMALIZE_STYLE]: `normalizeStyle`,
		[NORMALIZE_PROPS]: `normalizeProps`,
		[GUARD_REACTIVE_PROPS]: `guardReactiveProps`,
		[TO_HANDLERS]: `toHandlers`,
		[CAMELIZE]: `camelize`,
		[CAPITALIZE]: `capitalize`,
		[TO_HANDLER_KEY]: `toHandlerKey`,
		[SET_BLOCK_TRACKING]: `setBlockTracking`,
		[PUSH_SCOPE_ID]: `pushScopeId`,
		[POP_SCOPE_ID]: `popScopeId`,
		[WITH_CTX]: `withCtx`,
		[UNREF]: `unref`,
		[IS_REF]: `isRef`,
		[WITH_MEMO]: `withMemo`,
		[IS_MEMO_SAME]: `isMemoSame`
	};
	Namespaces = {
		"HTML": 0,
		"0": "HTML",
		"SVG": 1,
		"1": "SVG",
		"MATH_ML": 2,
		"2": "MATH_ML"
	};
	NodeTypes = {
		"ROOT": 0,
		"0": "ROOT",
		"ELEMENT": 1,
		"1": "ELEMENT",
		"TEXT": 2,
		"2": "TEXT",
		"COMMENT": 3,
		"3": "COMMENT",
		"SIMPLE_EXPRESSION": 4,
		"4": "SIMPLE_EXPRESSION",
		"INTERPOLATION": 5,
		"5": "INTERPOLATION",
		"ATTRIBUTE": 6,
		"6": "ATTRIBUTE",
		"DIRECTIVE": 7,
		"7": "DIRECTIVE",
		"COMPOUND_EXPRESSION": 8,
		"8": "COMPOUND_EXPRESSION",
		"IF": 9,
		"9": "IF",
		"IF_BRANCH": 10,
		"10": "IF_BRANCH",
		"FOR": 11,
		"11": "FOR",
		"TEXT_CALL": 12,
		"12": "TEXT_CALL",
		"VNODE_CALL": 13,
		"13": "VNODE_CALL",
		"JS_CALL_EXPRESSION": 14,
		"14": "JS_CALL_EXPRESSION",
		"JS_OBJECT_EXPRESSION": 15,
		"15": "JS_OBJECT_EXPRESSION",
		"JS_PROPERTY": 16,
		"16": "JS_PROPERTY",
		"JS_ARRAY_EXPRESSION": 17,
		"17": "JS_ARRAY_EXPRESSION",
		"JS_FUNCTION_EXPRESSION": 18,
		"18": "JS_FUNCTION_EXPRESSION",
		"JS_CONDITIONAL_EXPRESSION": 19,
		"19": "JS_CONDITIONAL_EXPRESSION",
		"JS_CACHE_EXPRESSION": 20,
		"20": "JS_CACHE_EXPRESSION",
		"JS_BLOCK_STATEMENT": 21,
		"21": "JS_BLOCK_STATEMENT",
		"JS_TEMPLATE_LITERAL": 22,
		"22": "JS_TEMPLATE_LITERAL",
		"JS_IF_STATEMENT": 23,
		"23": "JS_IF_STATEMENT",
		"JS_ASSIGNMENT_EXPRESSION": 24,
		"24": "JS_ASSIGNMENT_EXPRESSION",
		"JS_SEQUENCE_EXPRESSION": 25,
		"25": "JS_SEQUENCE_EXPRESSION",
		"JS_RETURN_STATEMENT": 26,
		"26": "JS_RETURN_STATEMENT"
	};
	ElementTypes = {
		"ELEMENT": 0,
		"0": "ELEMENT",
		"COMPONENT": 1,
		"1": "COMPONENT",
		"SLOT": 2,
		"2": "SLOT",
		"TEMPLATE": 3,
		"3": "TEMPLATE"
	};
	ConstantTypes = {
		"NOT_CONSTANT": 0,
		"0": "NOT_CONSTANT",
		"CAN_SKIP_PATCH": 1,
		"1": "CAN_SKIP_PATCH",
		"CAN_CACHE": 2,
		"2": "CAN_CACHE",
		"CAN_STRINGIFY": 3,
		"3": "CAN_STRINGIFY"
	};
	locStub = {
		start: {
			line: 1,
			column: 1,
			offset: 0
		},
		end: {
			line: 1,
			column: 1,
			offset: 0
		},
		source: ""
	};
	defaultDelimitersOpen = new Uint8Array([123, 123]);
	defaultDelimitersClose = new Uint8Array([125, 125]);
	Sequences = {
		Cdata: new Uint8Array([
			67,
			68,
			65,
			84,
			65,
			91
		]),
		CdataEnd: new Uint8Array([
			93,
			93,
			62
		]),
		CommentEnd: new Uint8Array([
			45,
			45,
			62
		]),
		ScriptEnd: new Uint8Array([
			60,
			47,
			115,
			99,
			114,
			105,
			112,
			116
		]),
		StyleEnd: new Uint8Array([
			60,
			47,
			115,
			116,
			121,
			108,
			101
		]),
		TitleEnd: new Uint8Array([
			60,
			47,
			116,
			105,
			116,
			108,
			101
		]),
		TextareaEnd: new Uint8Array([
			60,
			47,
			116,
			101,
			120,
			116,
			97,
			114,
			101,
			97
		])
	};
	Tokenizer = class {
		constructor(stack, cbs) {
			this.stack = stack;
			this.cbs = cbs;
			/** The current state the tokenizer is in. */
			this.state = 1;
			/** The read buffer. */
			this.buffer = "";
			/** The beginning of the section that is currently being read. */
			this.sectionStart = 0;
			/** The index within the buffer that we are currently looking at. */
			this.index = 0;
			/** The start of the last entity. */
			this.entityStart = 0;
			/** Some behavior, eg. when decoding entities, is done while we are in another state. This keeps track of the other state type. */
			this.baseState = 1;
			/** For special parsing behavior inside of script and style tags. */
			this.inRCDATA = false;
			/** For disabling RCDATA tags handling */
			this.inXML = false;
			/** For disabling interpolation parsing in v-pre */
			this.inVPre = false;
			/** Record newline positions for fast line / column calculation */
			this.newlines = [];
			this.mode = 0;
			this.delimiterOpen = defaultDelimitersOpen;
			this.delimiterClose = defaultDelimitersClose;
			this.delimiterIndex = -1;
			this.currentSequence = void 0;
			this.sequenceIndex = 0;
		}
		get inSFCRoot() {
			return this.mode === 2 && this.stack.length === 0;
		}
		reset() {
			this.state = 1;
			this.mode = 0;
			this.buffer = "";
			this.sectionStart = 0;
			this.index = 0;
			this.baseState = 1;
			this.inRCDATA = false;
			this.currentSequence = void 0;
			this.newlines.length = 0;
			this.delimiterOpen = defaultDelimitersOpen;
			this.delimiterClose = defaultDelimitersClose;
		}
		/**
		* Generate Position object with line / column information using recorded
		* newline positions. We know the index is always going to be an already
		* processed index, so all the newlines up to this index should have been
		* recorded.
		*/
		getPos(index) {
			let line = 1;
			let column = index + 1;
			const length = this.newlines.length;
			let j = -1;
			if (length > 100) {
				let l = -1;
				let r = length;
				while (l + 1 < r) {
					const m = l + r >>> 1;
					this.newlines[m] < index ? l = m : r = m;
				}
				j = l;
			} else for (let i = length - 1; i >= 0; i--) if (index > this.newlines[i]) {
				j = i;
				break;
			}
			if (j >= 0) {
				line = j + 2;
				column = index - this.newlines[j];
			}
			return {
				column,
				line,
				offset: index
			};
		}
		peek() {
			return this.buffer.charCodeAt(this.index + 1);
		}
		stateText(c) {
			if (c === 60) {
				if (this.index > this.sectionStart) this.cbs.ontext(this.sectionStart, this.index);
				this.state = 5;
				this.sectionStart = this.index;
			} else if (!this.inVPre && c === this.delimiterOpen[0]) {
				this.state = 2;
				this.delimiterIndex = 0;
				this.stateInterpolationOpen(c);
			}
		}
		stateInterpolationOpen(c) {
			if (c === this.delimiterOpen[this.delimiterIndex]) {
				if (this.delimiterIndex === this.delimiterOpen.length - 1) {
					const start = this.index + 1 - this.delimiterOpen.length;
					if (start > this.sectionStart) this.cbs.ontext(this.sectionStart, start);
					this.state = 3;
					this.sectionStart = start;
				} else this.delimiterIndex++;
			} else if (this.inRCDATA) {
				this.state = 32;
				this.stateInRCDATA(c);
			} else {
				this.state = 1;
				this.stateText(c);
			}
		}
		stateInterpolation(c) {
			if (c === this.delimiterClose[0]) {
				this.state = 4;
				this.delimiterIndex = 0;
				this.stateInterpolationClose(c);
			}
		}
		stateInterpolationClose(c) {
			if (c === this.delimiterClose[this.delimiterIndex]) {
				if (this.delimiterIndex === this.delimiterClose.length - 1) {
					this.cbs.oninterpolation(this.sectionStart, this.index + 1);
					if (this.inRCDATA) this.state = 32;
					else this.state = 1;
					this.sectionStart = this.index + 1;
				} else this.delimiterIndex++;
			} else {
				this.state = 3;
				this.stateInterpolation(c);
			}
		}
		stateSpecialStartSequence(c) {
			const isEnd = this.sequenceIndex === this.currentSequence.length;
			if (!(isEnd ? isEndOfTagSection(c) : (c | 32) === this.currentSequence[this.sequenceIndex])) this.inRCDATA = false;
			else if (!isEnd) {
				this.sequenceIndex++;
				return;
			}
			this.sequenceIndex = 0;
			this.state = 6;
			this.stateInTagName(c);
		}
		/** Look for an end tag. For <title> and <textarea>, also decode entities. */
		stateInRCDATA(c) {
			if (this.sequenceIndex === this.currentSequence.length) {
				if (c === 62 || isWhitespace(c)) {
					const endOfText = this.index - this.currentSequence.length;
					if (this.sectionStart < endOfText) {
						const actualIndex = this.index;
						this.index = endOfText;
						this.cbs.ontext(this.sectionStart, endOfText);
						this.index = actualIndex;
					}
					this.sectionStart = endOfText + 2;
					this.stateInClosingTagName(c);
					this.inRCDATA = false;
					return;
				}
				this.sequenceIndex = 0;
			}
			if ((c | 32) === this.currentSequence[this.sequenceIndex]) this.sequenceIndex += 1;
			else if (this.sequenceIndex === 0) {
				if (this.currentSequence === Sequences.TitleEnd || this.currentSequence === Sequences.TextareaEnd && !this.inSFCRoot) {
					if (!this.inVPre && c === this.delimiterOpen[0]) {
						this.state = 2;
						this.delimiterIndex = 0;
						this.stateInterpolationOpen(c);
					}
				} else if (this.fastForwardTo(60)) this.sequenceIndex = 1;
			} else this.sequenceIndex = Number(c === 60);
		}
		stateCDATASequence(c) {
			if (c === Sequences.Cdata[this.sequenceIndex]) {
				if (++this.sequenceIndex === Sequences.Cdata.length) {
					this.state = 28;
					this.currentSequence = Sequences.CdataEnd;
					this.sequenceIndex = 0;
					this.sectionStart = this.index + 1;
				}
			} else {
				this.sequenceIndex = 0;
				this.state = 23;
				this.stateInDeclaration(c);
			}
		}
		/**
		* When we wait for one specific character, we can speed things up
		* by skipping through the buffer until we find it.
		*
		* @returns Whether the character was found.
		*/
		fastForwardTo(c) {
			while (++this.index < this.buffer.length) {
				const cc = this.buffer.charCodeAt(this.index);
				if (cc === 10) this.newlines.push(this.index);
				if (cc === c) return true;
			}
			this.index = this.buffer.length - 1;
			return false;
		}
		/**
		* Comments and CDATA end with `-->` and `]]>`.
		*
		* Their common qualities are:
		* - Their end sequences have a distinct character they start with.
		* - That character is then repeated, so we have to check multiple repeats.
		* - All characters but the start character of the sequence can be skipped.
		*/
		stateInCommentLike(c) {
			if (c === this.currentSequence[this.sequenceIndex]) {
				if (++this.sequenceIndex === this.currentSequence.length) {
					if (this.currentSequence === Sequences.CdataEnd) this.cbs.oncdata(this.sectionStart, this.index - 2);
					else this.cbs.oncomment(this.sectionStart, this.index - 2);
					this.sequenceIndex = 0;
					this.sectionStart = this.index + 1;
					this.state = 1;
				}
			} else if (this.sequenceIndex === 0) {
				if (this.fastForwardTo(this.currentSequence[0])) this.sequenceIndex = 1;
			} else if (c !== this.currentSequence[this.sequenceIndex - 1]) this.sequenceIndex = 0;
		}
		startSpecial(sequence, offset) {
			this.enterRCDATA(sequence, offset);
			this.state = 31;
		}
		enterRCDATA(sequence, offset) {
			this.inRCDATA = true;
			this.currentSequence = sequence;
			this.sequenceIndex = offset;
		}
		stateBeforeTagName(c) {
			if (c === 33) {
				this.state = 22;
				this.sectionStart = this.index + 1;
			} else if (c === 63) {
				this.state = 24;
				this.sectionStart = this.index + 1;
			} else if (isTagStartChar(c)) {
				this.sectionStart = this.index;
				if (this.mode === 0) this.state = 6;
				else if (this.inSFCRoot) this.state = 34;
				else if (!this.inXML) {
					if (c === 116) this.state = 30;
					else this.state = c === 115 ? 29 : 6;
				} else this.state = 6;
			} else if (c === 47) this.state = 8;
			else {
				this.state = 1;
				this.stateText(c);
			}
		}
		stateInTagName(c) {
			if (isEndOfTagSection(c)) this.handleTagName(c);
		}
		stateInSFCRootTagName(c) {
			if (isEndOfTagSection(c)) {
				const tag = this.buffer.slice(this.sectionStart, this.index);
				if (tag !== "template") this.enterRCDATA(toCharCodes(`</` + tag), 0);
				this.handleTagName(c);
			}
		}
		handleTagName(c) {
			this.cbs.onopentagname(this.sectionStart, this.index);
			this.sectionStart = -1;
			this.state = 11;
			this.stateBeforeAttrName(c);
		}
		stateBeforeClosingTagName(c) {
			if (isWhitespace(c));
			else if (c === 62) {
				this.state = 1;
				this.sectionStart = this.index + 1;
			} else {
				this.state = isTagStartChar(c) ? 9 : 27;
				this.sectionStart = this.index;
			}
		}
		stateInClosingTagName(c) {
			if (c === 62 || isWhitespace(c)) {
				this.cbs.onclosetag(this.sectionStart, this.index);
				this.sectionStart = -1;
				this.state = 10;
				this.stateAfterClosingTagName(c);
			}
		}
		stateAfterClosingTagName(c) {
			if (c === 62) {
				this.state = 1;
				this.sectionStart = this.index + 1;
			}
		}
		stateBeforeAttrName(c) {
			if (c === 62) {
				this.cbs.onopentagend(this.index);
				if (this.inRCDATA) this.state = 32;
				else this.state = 1;
				this.sectionStart = this.index + 1;
			} else if (c === 47) this.state = 7;
			else if (c === 60 && this.peek() === 47) {
				this.cbs.onopentagend(this.index);
				this.state = 5;
				this.sectionStart = this.index;
			} else if (!isWhitespace(c)) this.handleAttrStart(c);
		}
		handleAttrStart(c) {
			if (c === 118 && this.peek() === 45) {
				this.state = 13;
				this.sectionStart = this.index;
			} else if (c === 46 || c === 58 || c === 64 || c === 35) {
				this.cbs.ondirname(this.index, this.index + 1);
				this.state = 14;
				this.sectionStart = this.index + 1;
			} else {
				this.state = 12;
				this.sectionStart = this.index;
			}
		}
		stateInSelfClosingTag(c) {
			if (c === 62) {
				this.cbs.onselfclosingtag(this.index);
				this.state = 1;
				this.sectionStart = this.index + 1;
				this.inRCDATA = false;
			} else if (!isWhitespace(c)) {
				this.state = 11;
				this.stateBeforeAttrName(c);
			}
		}
		stateInAttrName(c) {
			if (c === 61 || isEndOfTagSection(c)) {
				this.cbs.onattribname(this.sectionStart, this.index);
				this.handleAttrNameEnd(c);
			}
		}
		stateInDirName(c) {
			if (c === 61 || isEndOfTagSection(c)) {
				this.cbs.ondirname(this.sectionStart, this.index);
				this.handleAttrNameEnd(c);
			} else if (c === 58) {
				this.cbs.ondirname(this.sectionStart, this.index);
				this.state = 14;
				this.sectionStart = this.index + 1;
			} else if (c === 46) {
				this.cbs.ondirname(this.sectionStart, this.index);
				this.state = 16;
				this.sectionStart = this.index + 1;
			}
		}
		stateInDirArg(c) {
			if (c === 61 || isEndOfTagSection(c)) {
				this.cbs.ondirarg(this.sectionStart, this.index);
				this.handleAttrNameEnd(c);
			} else if (c === 91) this.state = 15;
			else if (c === 46) {
				this.cbs.ondirarg(this.sectionStart, this.index);
				this.state = 16;
				this.sectionStart = this.index + 1;
			}
		}
		stateInDynamicDirArg(c) {
			if (c === 93) this.state = 14;
			else if (c === 61 || isEndOfTagSection(c)) {
				this.cbs.ondirarg(this.sectionStart, this.index + 1);
				this.handleAttrNameEnd(c);
			}
		}
		stateInDirModifier(c) {
			if (c === 61 || isEndOfTagSection(c)) {
				this.cbs.ondirmodifier(this.sectionStart, this.index);
				this.handleAttrNameEnd(c);
			} else if (c === 46) {
				this.cbs.ondirmodifier(this.sectionStart, this.index);
				this.sectionStart = this.index + 1;
			}
		}
		handleAttrNameEnd(c) {
			this.sectionStart = this.index;
			this.state = 17;
			this.cbs.onattribnameend(this.index);
			this.stateAfterAttrName(c);
		}
		stateAfterAttrName(c) {
			if (c === 61) this.state = 18;
			else if (c === 47 || c === 62) {
				this.cbs.onattribend(0, this.sectionStart);
				this.sectionStart = -1;
				this.state = 11;
				this.stateBeforeAttrName(c);
			} else if (!isWhitespace(c)) {
				this.cbs.onattribend(0, this.sectionStart);
				this.handleAttrStart(c);
			}
		}
		stateBeforeAttrValue(c) {
			if (c === 34) {
				this.state = 19;
				this.sectionStart = this.index + 1;
			} else if (c === 39) {
				this.state = 20;
				this.sectionStart = this.index + 1;
			} else if (!isWhitespace(c)) {
				this.sectionStart = this.index;
				this.state = 21;
				this.stateInAttrValueNoQuotes(c);
			}
		}
		handleInAttrValue(c, quote) {
			if (c === quote || this.fastForwardTo(quote)) {
				this.cbs.onattribdata(this.sectionStart, this.index);
				this.sectionStart = -1;
				this.cbs.onattribend(quote === 34 ? 3 : 2, this.index + 1);
				this.state = 11;
			}
		}
		stateInAttrValueDoubleQuotes(c) {
			this.handleInAttrValue(c, 34);
		}
		stateInAttrValueSingleQuotes(c) {
			this.handleInAttrValue(c, 39);
		}
		stateInAttrValueNoQuotes(c) {
			if (isWhitespace(c) || c === 62) {
				this.cbs.onattribdata(this.sectionStart, this.index);
				this.sectionStart = -1;
				this.cbs.onattribend(1, this.index);
				this.state = 11;
				this.stateBeforeAttrName(c);
			} else if (c === 39 || c === 60 || c === 61 || c === 96) this.cbs.onerr(18, this.index);
		}
		stateBeforeDeclaration(c) {
			if (c === 91) {
				this.state = 26;
				this.sequenceIndex = 0;
			} else this.state = c === 45 ? 25 : 23;
		}
		stateInDeclaration(c) {
			if (c === 62 || this.fastForwardTo(62)) {
				this.state = 1;
				this.sectionStart = this.index + 1;
			}
		}
		stateInProcessingInstruction(c) {
			if (c === 62 || this.fastForwardTo(62)) {
				this.cbs.onprocessinginstruction(this.sectionStart, this.index);
				this.state = 1;
				this.sectionStart = this.index + 1;
			}
		}
		stateBeforeComment(c) {
			if (c === 45) {
				this.state = 28;
				this.currentSequence = Sequences.CommentEnd;
				this.sequenceIndex = 2;
				this.sectionStart = this.index + 1;
			} else this.state = 23;
		}
		stateInSpecialComment(c) {
			if (c === 62 || this.fastForwardTo(62)) {
				this.cbs.oncomment(this.sectionStart, this.index);
				this.state = 1;
				this.sectionStart = this.index + 1;
			}
		}
		stateBeforeSpecialS(c) {
			if (c === Sequences.ScriptEnd[3]) this.startSpecial(Sequences.ScriptEnd, 4);
			else if (c === Sequences.StyleEnd[3]) this.startSpecial(Sequences.StyleEnd, 4);
			else {
				this.state = 6;
				this.stateInTagName(c);
			}
		}
		stateBeforeSpecialT(c) {
			if (c === Sequences.TitleEnd[3]) this.startSpecial(Sequences.TitleEnd, 4);
			else if (c === Sequences.TextareaEnd[3]) this.startSpecial(Sequences.TextareaEnd, 4);
			else {
				this.state = 6;
				this.stateInTagName(c);
			}
		}
		startEntity() {}
		stateInEntity() {}
		/**
		* Iterates through the buffer, calling the function corresponding to the current state.
		*
		* States that are more likely to be hit are higher up, as a performance improvement.
		*/
		parse(input) {
			this.buffer = input;
			while (this.index < this.buffer.length) {
				const c = this.buffer.charCodeAt(this.index);
				if (c === 10 && this.state !== 33) this.newlines.push(this.index);
				switch (this.state) {
					case 1:
						this.stateText(c);
						break;
					case 2:
						this.stateInterpolationOpen(c);
						break;
					case 3:
						this.stateInterpolation(c);
						break;
					case 4:
						this.stateInterpolationClose(c);
						break;
					case 31:
						this.stateSpecialStartSequence(c);
						break;
					case 32:
						this.stateInRCDATA(c);
						break;
					case 26:
						this.stateCDATASequence(c);
						break;
					case 19:
						this.stateInAttrValueDoubleQuotes(c);
						break;
					case 12:
						this.stateInAttrName(c);
						break;
					case 13:
						this.stateInDirName(c);
						break;
					case 14:
						this.stateInDirArg(c);
						break;
					case 15:
						this.stateInDynamicDirArg(c);
						break;
					case 16:
						this.stateInDirModifier(c);
						break;
					case 28:
						this.stateInCommentLike(c);
						break;
					case 27:
						this.stateInSpecialComment(c);
						break;
					case 11:
						this.stateBeforeAttrName(c);
						break;
					case 6:
						this.stateInTagName(c);
						break;
					case 34:
						this.stateInSFCRootTagName(c);
						break;
					case 9:
						this.stateInClosingTagName(c);
						break;
					case 5:
						this.stateBeforeTagName(c);
						break;
					case 17:
						this.stateAfterAttrName(c);
						break;
					case 20:
						this.stateInAttrValueSingleQuotes(c);
						break;
					case 18:
						this.stateBeforeAttrValue(c);
						break;
					case 8:
						this.stateBeforeClosingTagName(c);
						break;
					case 10:
						this.stateAfterClosingTagName(c);
						break;
					case 29:
						this.stateBeforeSpecialS(c);
						break;
					case 30:
						this.stateBeforeSpecialT(c);
						break;
					case 21:
						this.stateInAttrValueNoQuotes(c);
						break;
					case 7:
						this.stateInSelfClosingTag(c);
						break;
					case 23:
						this.stateInDeclaration(c);
						break;
					case 22:
						this.stateBeforeDeclaration(c);
						break;
					case 25:
						this.stateBeforeComment(c);
						break;
					case 24:
						this.stateInProcessingInstruction(c);
						break;
					case 33: this.stateInEntity();
				}
				this.index++;
			}
			this.cleanup();
			this.finish();
		}
		/**
		* Remove data that has already been consumed from the buffer.
		*/
		cleanup() {
			if (this.sectionStart !== this.index) {
				if (this.state === 1 || this.state === 32 && this.sequenceIndex === 0) {
					this.cbs.ontext(this.sectionStart, this.index);
					this.sectionStart = this.index;
				} else if (this.state === 19 || this.state === 20 || this.state === 21) {
					this.cbs.onattribdata(this.sectionStart, this.index);
					this.sectionStart = this.index;
				}
			}
		}
		finish() {
			this.handleTrailingData();
			this.cbs.onend();
		}
		/** Handle any trailing data. */
		handleTrailingData() {
			const endIndex = this.buffer.length;
			if (this.sectionStart >= endIndex) return;
			if (this.state === 28) {
				if (this.currentSequence === Sequences.CdataEnd) this.cbs.oncdata(this.sectionStart, endIndex);
				else this.cbs.oncomment(this.sectionStart, endIndex);
			} else if (this.state === 6 || this.state === 11 || this.state === 18 || this.state === 17 || this.state === 12 || this.state === 13 || this.state === 14 || this.state === 15 || this.state === 16 || this.state === 20 || this.state === 19 || this.state === 21 || this.state === 9);
			else this.cbs.ontext(this.sectionStart, endIndex);
		}
		emitCodePoint(cp, consumed) {}
	};
	CompilerDeprecationTypes = {
		"COMPILER_IS_ON_ELEMENT": "COMPILER_IS_ON_ELEMENT",
		"COMPILER_V_BIND_SYNC": "COMPILER_V_BIND_SYNC",
		"COMPILER_V_BIND_OBJECT_ORDER": "COMPILER_V_BIND_OBJECT_ORDER",
		"COMPILER_V_ON_NATIVE": "COMPILER_V_ON_NATIVE",
		"COMPILER_V_IF_V_FOR_PRECEDENCE": "COMPILER_V_IF_V_FOR_PRECEDENCE",
		"COMPILER_NATIVE_TEMPLATE": "COMPILER_NATIVE_TEMPLATE",
		"COMPILER_INLINE_TEMPLATE": "COMPILER_INLINE_TEMPLATE",
		"COMPILER_FILTERS": "COMPILER_FILTERS"
	};
	deprecationData = {
		["COMPILER_IS_ON_ELEMENT"]: {
			message: `Platform-native elements with "is" prop will no longer be treated as components in Vue 3 unless the "is" value is explicitly prefixed with "vue:".`,
			link: `https://v3-migration.vuejs.org/breaking-changes/custom-elements-interop.html`
		},
		["COMPILER_V_BIND_SYNC"]: {
			message: (key) => `.sync modifier for v-bind has been removed. Use v-model with argument instead. \`v-bind:${key}.sync\` should be changed to \`v-model:${key}\`.`,
			link: `https://v3-migration.vuejs.org/breaking-changes/v-model.html`
		},
		["COMPILER_V_BIND_OBJECT_ORDER"]: {
			message: `v-bind="obj" usage is now order sensitive and behaves like JavaScript object spread: it will now overwrite an existing non-mergeable attribute that appears before v-bind in the case of conflict. To retain 2.x behavior, move v-bind to make it the first attribute. You can also suppress this warning if the usage is intended.`,
			link: `https://v3-migration.vuejs.org/breaking-changes/v-bind.html`
		},
		["COMPILER_V_ON_NATIVE"]: {
			message: `.native modifier for v-on has been removed as is no longer necessary.`,
			link: `https://v3-migration.vuejs.org/breaking-changes/v-on-native-modifier-removed.html`
		},
		["COMPILER_V_IF_V_FOR_PRECEDENCE"]: {
			message: `v-if / v-for precedence when used on the same element has changed in Vue 3: v-if now takes higher precedence and will no longer have access to v-for scope variables. It is best to avoid the ambiguity with <template> tags or use a computed property that filters v-for data source.`,
			link: `https://v3-migration.vuejs.org/breaking-changes/v-if-v-for.html`
		},
		["COMPILER_NATIVE_TEMPLATE"]: { message: `<template> with no special directives will render as a native template element instead of its inner content in Vue 3.` },
		["COMPILER_INLINE_TEMPLATE"]: {
			message: `"inline-template" has been removed in Vue 3.`,
			link: `https://v3-migration.vuejs.org/breaking-changes/inline-template-attribute.html`
		},
		["COMPILER_FILTERS"]: {
			message: `filters have been removed in Vue 3. The "|" symbol will be treated as native JavaScript bitwise OR operator. Use method calls or computed properties instead.`,
			link: `https://v3-migration.vuejs.org/breaking-changes/filters.html`
		}
	};
	ErrorCodes = {
		"ABRUPT_CLOSING_OF_EMPTY_COMMENT": 0,
		"0": "ABRUPT_CLOSING_OF_EMPTY_COMMENT",
		"CDATA_IN_HTML_CONTENT": 1,
		"1": "CDATA_IN_HTML_CONTENT",
		"DUPLICATE_ATTRIBUTE": 2,
		"2": "DUPLICATE_ATTRIBUTE",
		"END_TAG_WITH_ATTRIBUTES": 3,
		"3": "END_TAG_WITH_ATTRIBUTES",
		"END_TAG_WITH_TRAILING_SOLIDUS": 4,
		"4": "END_TAG_WITH_TRAILING_SOLIDUS",
		"EOF_BEFORE_TAG_NAME": 5,
		"5": "EOF_BEFORE_TAG_NAME",
		"EOF_IN_CDATA": 6,
		"6": "EOF_IN_CDATA",
		"EOF_IN_COMMENT": 7,
		"7": "EOF_IN_COMMENT",
		"EOF_IN_SCRIPT_HTML_COMMENT_LIKE_TEXT": 8,
		"8": "EOF_IN_SCRIPT_HTML_COMMENT_LIKE_TEXT",
		"EOF_IN_TAG": 9,
		"9": "EOF_IN_TAG",
		"INCORRECTLY_CLOSED_COMMENT": 10,
		"10": "INCORRECTLY_CLOSED_COMMENT",
		"INCORRECTLY_OPENED_COMMENT": 11,
		"11": "INCORRECTLY_OPENED_COMMENT",
		"INVALID_FIRST_CHARACTER_OF_TAG_NAME": 12,
		"12": "INVALID_FIRST_CHARACTER_OF_TAG_NAME",
		"MISSING_ATTRIBUTE_VALUE": 13,
		"13": "MISSING_ATTRIBUTE_VALUE",
		"MISSING_END_TAG_NAME": 14,
		"14": "MISSING_END_TAG_NAME",
		"MISSING_WHITESPACE_BETWEEN_ATTRIBUTES": 15,
		"15": "MISSING_WHITESPACE_BETWEEN_ATTRIBUTES",
		"NESTED_COMMENT": 16,
		"16": "NESTED_COMMENT",
		"UNEXPECTED_CHARACTER_IN_ATTRIBUTE_NAME": 17,
		"17": "UNEXPECTED_CHARACTER_IN_ATTRIBUTE_NAME",
		"UNEXPECTED_CHARACTER_IN_UNQUOTED_ATTRIBUTE_VALUE": 18,
		"18": "UNEXPECTED_CHARACTER_IN_UNQUOTED_ATTRIBUTE_VALUE",
		"UNEXPECTED_EQUALS_SIGN_BEFORE_ATTRIBUTE_NAME": 19,
		"19": "UNEXPECTED_EQUALS_SIGN_BEFORE_ATTRIBUTE_NAME",
		"UNEXPECTED_NULL_CHARACTER": 20,
		"20": "UNEXPECTED_NULL_CHARACTER",
		"UNEXPECTED_QUESTION_MARK_INSTEAD_OF_TAG_NAME": 21,
		"21": "UNEXPECTED_QUESTION_MARK_INSTEAD_OF_TAG_NAME",
		"UNEXPECTED_SOLIDUS_IN_TAG": 22,
		"22": "UNEXPECTED_SOLIDUS_IN_TAG",
		"X_INVALID_END_TAG": 23,
		"23": "X_INVALID_END_TAG",
		"X_MISSING_END_TAG": 24,
		"24": "X_MISSING_END_TAG",
		"X_MISSING_INTERPOLATION_END": 25,
		"25": "X_MISSING_INTERPOLATION_END",
		"X_MISSING_DIRECTIVE_NAME": 26,
		"26": "X_MISSING_DIRECTIVE_NAME",
		"X_MISSING_DYNAMIC_DIRECTIVE_ARGUMENT_END": 27,
		"27": "X_MISSING_DYNAMIC_DIRECTIVE_ARGUMENT_END",
		"X_V_IF_NO_EXPRESSION": 28,
		"28": "X_V_IF_NO_EXPRESSION",
		"X_V_IF_SAME_KEY": 29,
		"29": "X_V_IF_SAME_KEY",
		"X_V_ELSE_NO_ADJACENT_IF": 30,
		"30": "X_V_ELSE_NO_ADJACENT_IF",
		"X_V_FOR_NO_EXPRESSION": 31,
		"31": "X_V_FOR_NO_EXPRESSION",
		"X_V_FOR_MALFORMED_EXPRESSION": 32,
		"32": "X_V_FOR_MALFORMED_EXPRESSION",
		"X_V_FOR_TEMPLATE_KEY_PLACEMENT": 33,
		"33": "X_V_FOR_TEMPLATE_KEY_PLACEMENT",
		"X_V_BIND_NO_EXPRESSION": 34,
		"34": "X_V_BIND_NO_EXPRESSION",
		"X_V_ON_NO_EXPRESSION": 35,
		"35": "X_V_ON_NO_EXPRESSION",
		"X_V_SLOT_UNEXPECTED_DIRECTIVE_ON_SLOT_OUTLET": 36,
		"36": "X_V_SLOT_UNEXPECTED_DIRECTIVE_ON_SLOT_OUTLET",
		"X_V_SLOT_MIXED_SLOT_USAGE": 37,
		"37": "X_V_SLOT_MIXED_SLOT_USAGE",
		"X_V_SLOT_DUPLICATE_SLOT_NAMES": 38,
		"38": "X_V_SLOT_DUPLICATE_SLOT_NAMES",
		"X_V_SLOT_EXTRANEOUS_DEFAULT_SLOT_CHILDREN": 39,
		"39": "X_V_SLOT_EXTRANEOUS_DEFAULT_SLOT_CHILDREN",
		"X_V_SLOT_MISPLACED": 40,
		"40": "X_V_SLOT_MISPLACED",
		"X_V_MODEL_NO_EXPRESSION": 41,
		"41": "X_V_MODEL_NO_EXPRESSION",
		"X_V_MODEL_MALFORMED_EXPRESSION": 42,
		"42": "X_V_MODEL_MALFORMED_EXPRESSION",
		"X_V_MODEL_ON_SCOPE_VARIABLE": 43,
		"43": "X_V_MODEL_ON_SCOPE_VARIABLE",
		"X_V_MODEL_ON_PROPS": 44,
		"44": "X_V_MODEL_ON_PROPS",
		"X_V_MODEL_ON_CONST": 45,
		"45": "X_V_MODEL_ON_CONST",
		"X_INVALID_EXPRESSION": 46,
		"46": "X_INVALID_EXPRESSION",
		"X_KEEP_ALIVE_INVALID_CHILDREN": 47,
		"47": "X_KEEP_ALIVE_INVALID_CHILDREN",
		"X_PREFIX_ID_NOT_SUPPORTED": 48,
		"48": "X_PREFIX_ID_NOT_SUPPORTED",
		"X_MODULE_MODE_NOT_SUPPORTED": 49,
		"49": "X_MODULE_MODE_NOT_SUPPORTED",
		"X_CACHE_HANDLER_NOT_SUPPORTED": 50,
		"50": "X_CACHE_HANDLER_NOT_SUPPORTED",
		"X_SCOPE_ID_NOT_SUPPORTED": 51,
		"51": "X_SCOPE_ID_NOT_SUPPORTED",
		"X_VNODE_HOOKS": 52,
		"52": "X_VNODE_HOOKS",
		"X_V_BIND_INVALID_SAME_NAME_ARGUMENT": 53,
		"53": "X_V_BIND_INVALID_SAME_NAME_ARGUMENT",
		"__EXTEND_POINT__": 54,
		"54": "__EXTEND_POINT__"
	};
	errorMessages = {
		[0]: "Illegal comment.",
		[1]: "CDATA section is allowed only in XML context.",
		[2]: "Duplicate attribute.",
		[3]: "End tag cannot have attributes.",
		[4]: "Illegal '/' in tags.",
		[5]: "Unexpected EOF in tag.",
		[6]: "Unexpected EOF in CDATA section.",
		[7]: "Unexpected EOF in comment.",
		[8]: "Unexpected EOF in script.",
		[9]: "Unexpected EOF in tag.",
		[10]: "Incorrectly closed comment.",
		[11]: "Incorrectly opened comment.",
		[12]: "Illegal tag name. Use '&lt;' to print '<'.",
		[13]: "Attribute value was expected.",
		[14]: "End tag name was expected.",
		[15]: "Whitespace was expected.",
		[16]: "Unexpected '<!--' in comment.",
		[17]: `Attribute name cannot contain U+0022 ("), U+0027 ('), and U+003C (<).`,
		[18]: "Unquoted attribute value cannot contain U+0022 (\"), U+0027 ('), U+003C (<), U+003D (=), and U+0060 (`).",
		[19]: "Attribute name cannot start with '='.",
		[21]: "'<?' is allowed only in XML context.",
		[20]: `Unexpected null character.`,
		[22]: "Illegal '/' in tags.",
		[23]: "Invalid end tag.",
		[24]: "Element is missing end tag.",
		[25]: "Interpolation end sign was not found.",
		[27]: "End bracket for dynamic directive argument was not found. Note that dynamic directive argument cannot contain spaces.",
		[26]: "Legal directive name was expected.",
		[28]: `v-if/v-else-if is missing expression.`,
		[29]: `v-if/else branches must use unique keys.`,
		[30]: `v-else/v-else-if has no adjacent v-if or v-else-if.`,
		[31]: `v-for is missing expression.`,
		[32]: `v-for has invalid expression.`,
		[33]: `<template v-for> key should be placed on the <template> tag.`,
		[34]: `v-bind is missing expression.`,
		[53]: `v-bind with same-name shorthand only allows static argument.`,
		[35]: `v-on is missing expression.`,
		[36]: `Unexpected custom directive on <slot> outlet.`,
		[37]: `Mixed v-slot usage on both the component and nested <template>. When there are multiple named slots, all slots should use <template> syntax to avoid scope ambiguity.`,
		[38]: `Duplicate slot names found. `,
		[39]: `Extraneous children found when component already has explicitly named default slot. These children will be ignored.`,
		[40]: `v-slot can only be used on components or <template> tags.`,
		[41]: `v-model is missing expression.`,
		[42]: `v-model value must be a valid JavaScript member expression.`,
		[43]: `v-model cannot be used on v-for or v-slot scope variables because they are not writable.`,
		[44]: `v-model cannot be used on a prop, because local prop bindings are not writable.
Use a v-bind binding combined with a v-on listener that emits update:x event instead.`,
		[45]: `v-model cannot be used on a const binding because it is not writable.`,
		[46]: `Error parsing JavaScript expression: `,
		[47]: `<KeepAlive> expects exactly one child component.`,
		[52]: `@vnode-* hooks in templates are no longer supported. Use the vue: prefix instead. For example, @vnode-mounted should be changed to @vue:mounted. @vnode-* hooks support has been removed in 3.4.`,
		[48]: `"prefixIdentifiers" option is not supported in this build of compiler.`,
		[49]: `ES module mode is not supported in this build of compiler.`,
		[50]: `"cacheHandlers" option is only supported when the "prefixIdentifiers" option is enabled.`,
		[51]: `"scopeId" option is only supported in module mode.`,
		[54]: ``
	};
	isFunctionType = (node) => {
		return /Function(?:Expression|Declaration)$|Method$/.test(node.type);
	};
	isStaticProperty = (node) => node && (node.type === "ObjectProperty" || node.type === "ObjectMethod") && !node.computed;
	isStaticPropertyKey = (node, parent) => isStaticProperty(parent) && parent.key === node;
	TS_NODE_TYPES = [
		"TSAsExpression",
		"TSTypeAssertion",
		"TSNonNullExpression",
		"TSInstantiationExpression",
		"TSSatisfiesExpression"
	];
	isStaticExp = (p) => p.type === 4 && p.isStatic;
	nonIdentifierRE = /^$|^\d|[^\$\w\xA0-\uFFFF]/;
	isSimpleIdentifier = (name) => !nonIdentifierRE.test(name);
	validFirstIdentCharRE = /[A-Za-z_$\xA0-\uFFFF]/;
	validIdentCharRE = /[\.\?\w$\xA0-\uFFFF]/;
	whitespaceRE = /\s+[.[]\s*|\s*[.[]\s+/g;
	getExpSource = (exp) => exp.type === 4 ? exp.content : exp.loc.source;
	isMemberExpressionBrowser = (exp) => {
		const path = getExpSource(exp).trim().replace(whitespaceRE, (s) => s.trim());
		let state = 0;
		let stateStack = [];
		let currentOpenBracketCount = 0;
		let currentOpenParensCount = 0;
		let currentStringType = null;
		for (let i = 0; i < path.length; i++) {
			const char = path.charAt(i);
			switch (state) {
				case 0:
					if (char === "[") {
						stateStack.push(state);
						state = 1;
						currentOpenBracketCount++;
					} else if (char === "(") {
						stateStack.push(state);
						state = 2;
						currentOpenParensCount++;
					} else if (!(i === 0 ? validFirstIdentCharRE : validIdentCharRE).test(char)) return false;
					break;
				case 1:
					if (char === `'` || char === `"` || char === "`") {
						stateStack.push(state);
						state = 3;
						currentStringType = char;
					} else if (char === `[`) currentOpenBracketCount++;
					else if (char === `]`) {
						if (!--currentOpenBracketCount) state = stateStack.pop();
					}
					break;
				case 2:
					if (char === `'` || char === `"` || char === "`") {
						stateStack.push(state);
						state = 3;
						currentStringType = char;
					} else if (char === `(`) currentOpenParensCount++;
					else if (char === `)`) {
						if (i === path.length - 1) return false;
						if (!--currentOpenParensCount) state = stateStack.pop();
					}
					break;
				case 3: if (char === currentStringType) {
					state = stateStack.pop();
					currentStringType = null;
				}
			}
		}
		return !currentOpenBracketCount && !currentOpenParensCount;
	};
	isMemberExpressionNode = NOOP;
	isMemberExpression = isMemberExpressionBrowser;
	fnExpRE = /^\s*(?:async\s*)?(?:\([^)]*?\)|[\w$_]+)\s*(?::[^=]+)?=>|^\s*(?:async\s+)?function(?:\s+[\w$]+)?\s*\(/;
	isFnExpressionBrowser = (exp) => fnExpRE.test(getExpSource(exp));
	isFnExpressionNode = NOOP;
	isFnExpression = isFnExpressionBrowser;
	propsHelperSet = /* @__PURE__ */ new Set([NORMALIZE_PROPS, GUARD_REACTIVE_PROPS]);
	forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+(\S[\s\S]*)/;
	defaultParserOptions = {
		parseMode: "base",
		ns: 0,
		delimiters: [`{{`, `}}`],
		getNamespace: () => 0,
		isVoidTag: NO,
		isPreTag: NO,
		isIgnoreNewlineTag: NO,
		isCustomElement: NO,
		onError: defaultOnError,
		onWarn: defaultOnWarn,
		comments: false,
		prefixIdentifiers: false
	};
	currentOptions = defaultParserOptions;
	currentRoot = null;
	currentInput = "";
	currentOpenTag = null;
	currentProp = null;
	currentAttrValue = "";
	currentAttrStartIndex = -1;
	currentAttrEndIndex = -1;
	inPre = 0;
	inVPre = false;
	currentVPreBoundary = null;
	stack = [];
	tokenizer = new Tokenizer(stack, {
		onerr: emitError,
		ontext(start, end) {
			onText(getSlice(start, end), start, end);
		},
		ontextentity(char, start, end) {
			onText(char, start, end);
		},
		oninterpolation(start, end) {
			if (inVPre) return onText(getSlice(start, end), start, end);
			let innerStart = start + tokenizer.delimiterOpen.length;
			let innerEnd = end - tokenizer.delimiterClose.length;
			while (isWhitespace(currentInput.charCodeAt(innerStart))) innerStart++;
			while (isWhitespace(currentInput.charCodeAt(innerEnd - 1))) innerEnd--;
			let exp = getSlice(innerStart, innerEnd);
			if (exp.includes("&")) exp = currentOptions.decodeEntities(exp, false);
			addNode({
				type: 5,
				content: createExp(exp, false, getLoc(innerStart, innerEnd)),
				loc: getLoc(start, end)
			});
		},
		onopentagname(start, end) {
			const name = getSlice(start, end);
			currentOpenTag = {
				type: 1,
				tag: name,
				ns: currentOptions.getNamespace(name, stack[0], currentOptions.ns),
				tagType: 0,
				props: [],
				children: [],
				loc: getLoc(start - 1, end),
				codegenNode: void 0
			};
		},
		onopentagend(end) {
			endOpenTag(end);
		},
		onclosetag(start, end) {
			const name = getSlice(start, end);
			if (!currentOptions.isVoidTag(name)) {
				let found = false;
				for (let i = 0; i < stack.length; i++) if (stack[i].tag.toLowerCase() === name.toLowerCase()) {
					found = true;
					if (i > 0) emitError(24, stack[0].loc.start.offset);
					for (let j = 0; j <= i; j++) onCloseTag(stack.shift(), end, j < i);
					break;
				}
				if (!found) emitError(23, backTrack(start, 60));
			}
		},
		onselfclosingtag(end) {
			const name = currentOpenTag.tag;
			currentOpenTag.isSelfClosing = true;
			endOpenTag(end);
			if (stack[0] && stack[0].tag === name) onCloseTag(stack.shift(), end);
		},
		onattribname(start, end) {
			currentProp = {
				type: 6,
				name: getSlice(start, end),
				nameLoc: getLoc(start, end),
				value: void 0,
				loc: getLoc(start)
			};
		},
		ondirname(start, end) {
			const raw = getSlice(start, end);
			const name = raw === "." || raw === ":" ? "bind" : raw === "@" ? "on" : raw === "#" ? "slot" : raw.slice(2);
			if (!inVPre && name === "") emitError(26, start);
			if (inVPre || name === "") currentProp = {
				type: 6,
				name: raw,
				nameLoc: getLoc(start, end),
				value: void 0,
				loc: getLoc(start)
			};
			else {
				currentProp = {
					type: 7,
					name,
					rawName: raw,
					exp: void 0,
					arg: void 0,
					modifiers: raw === "." ? [createSimpleExpression("prop")] : [],
					loc: getLoc(start)
				};
				if (name === "pre") {
					inVPre = tokenizer.inVPre = true;
					currentVPreBoundary = currentOpenTag;
					const props = currentOpenTag.props;
					for (let i = 0; i < props.length; i++) if (props[i].type === 7) props[i] = dirToAttr(props[i]);
				}
			}
		},
		ondirarg(start, end) {
			if (start === end) return;
			const arg = getSlice(start, end);
			if (inVPre && !isVPre(currentProp)) {
				currentProp.name += arg;
				setLocEnd(currentProp.nameLoc, end);
			} else {
				const isStatic = arg[0] !== `[`;
				currentProp.arg = createExp(isStatic ? arg : arg.slice(1, -1), isStatic, getLoc(start, end), isStatic ? 3 : 0);
			}
		},
		ondirmodifier(start, end) {
			const mod = getSlice(start, end);
			if (inVPre && !isVPre(currentProp)) {
				currentProp.name += "." + mod;
				setLocEnd(currentProp.nameLoc, end);
			} else if (currentProp.name === "slot") {
				const arg = currentProp.arg;
				if (arg) {
					arg.content += "." + mod;
					setLocEnd(arg.loc, end);
				}
			} else {
				const exp = createSimpleExpression(mod, true, getLoc(start, end));
				currentProp.modifiers.push(exp);
			}
		},
		onattribdata(start, end) {
			currentAttrValue += getSlice(start, end);
			if (currentAttrStartIndex < 0) currentAttrStartIndex = start;
			currentAttrEndIndex = end;
		},
		onattribentity(char, start, end) {
			currentAttrValue += char;
			if (currentAttrStartIndex < 0) currentAttrStartIndex = start;
			currentAttrEndIndex = end;
		},
		onattribnameend(end) {
			const start = currentProp.loc.start.offset;
			const name = getSlice(start, end);
			if (currentProp.type === 7) currentProp.rawName = name;
			if (currentOpenTag.props.some((p) => (p.type === 7 ? p.rawName : p.name) === name)) emitError(2, start);
		},
		onattribend(quote, end) {
			if (currentOpenTag && currentProp) {
				setLocEnd(currentProp.loc, end);
				if (quote !== 0) {
					if (currentAttrValue.includes("&")) currentAttrValue = currentOptions.decodeEntities(currentAttrValue, true);
					if (currentProp.type === 6) {
						if (currentProp.name === "class") currentAttrValue = condense(currentAttrValue).trim();
						if (quote === 1 && !currentAttrValue) emitError(13, end);
						currentProp.value = {
							type: 2,
							content: currentAttrValue,
							loc: quote === 1 ? getLoc(currentAttrStartIndex, currentAttrEndIndex) : getLoc(currentAttrStartIndex - 1, currentAttrEndIndex + 1)
						};
						if (tokenizer.inSFCRoot && currentOpenTag.tag === "template" && currentProp.name === "lang" && currentAttrValue && currentAttrValue !== "html") tokenizer.enterRCDATA(toCharCodes(`</template`), 0);
					} else {
						currentProp.exp = createExp(currentAttrValue, false, getLoc(currentAttrStartIndex, currentAttrEndIndex), 0, 0);
						if (currentProp.name === "for") currentProp.forParseResult = parseForExpression(currentProp.exp);
						let syncIndex = -1;
						if (currentProp.name === "bind" && (syncIndex = currentProp.modifiers.findIndex((mod) => mod.content === "sync")) > -1 && checkCompatEnabled("COMPILER_V_BIND_SYNC", currentOptions, currentProp.loc, currentProp.arg.loc.source)) {
							currentProp.name = "model";
							currentProp.modifiers.splice(syncIndex, 1);
						}
					}
				}
				if (currentProp.type !== 7 || currentProp.name !== "pre") currentOpenTag.props.push(currentProp);
			}
			currentAttrValue = "";
			currentAttrStartIndex = currentAttrEndIndex = -1;
		},
		oncomment(start, end) {
			if (currentOptions.comments) addNode({
				type: 3,
				content: getSlice(start, end),
				loc: getLoc(start - 4, end + 3)
			});
		},
		onend() {
			const end = currentInput.length;
			for (let index = 0; index < stack.length; index++) {
				onCloseTag(stack[index], end - 1);
				emitError(24, stack[index].loc.start.offset);
			}
		},
		oncdata(start, end) {
			if (stack[0].ns !== 0) onText(getSlice(start, end), start, end);
			else emitError(1, start - 9);
		},
		onprocessinginstruction(start) {
			if ((stack[0] ? stack[0].ns : currentOptions.ns) === 0) emitError(21, start - 1);
		}
	});
	forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/;
	stripParensRE = /^\(|\)$/g;
	specialTemplateDir = /* @__PURE__ */ new Set([
		"if",
		"else",
		"else-if",
		"for",
		"slot"
	]);
	windowsNewlineRE = /\r\n/g;
	allowHoistedHelperSet = /* @__PURE__ */ new Set([
		NORMALIZE_CLASS,
		NORMALIZE_STYLE,
		NORMALIZE_PROPS,
		GUARD_REACTIVE_PROPS
	]);
	PURE_ANNOTATION = `/*@__PURE__*/`;
	aliasHelper = (s) => `${helperNameMap[s]}: _${helperNameMap[s]}`;
	new RegExp("\\b" + "arguments,await,break,case,catch,class,const,continue,debugger,default,delete,do,else,export,extends,finally,for,function,if,import,let,new,return,super,switch,throw,try,var,void,while,with,yield".split(",").join("\\b|\\b") + "\\b");
	transformExpression = (node, context) => {
		if (node.type === 5) node.content = processExpression(node.content, context);
		else if (node.type === 1) {
			const memo = findDir(node, "memo");
			for (let i = 0; i < node.props.length; i++) {
				const dir = node.props[i];
				if (dir.type === 7 && dir.name !== "for") {
					const exp = dir.exp;
					const arg = dir.arg;
					if (exp && exp.type === 4 && !(dir.name === "on" && arg) && !(memo && arg && arg.type === 4 && arg.content === "key")) dir.exp = processExpression(exp, context, dir.name === "slot");
					if (arg && arg.type === 4 && !arg.isStatic) dir.arg = processExpression(arg, context);
				}
			}
		}
	};
	transformIf = createStructuralDirectiveTransform(/^(?:if|else|else-if)$/, (node, dir, context) => {
		return processIf(node, dir, context, (ifNode, branch, isRoot) => {
			const siblings = context.parent.children;
			let i = siblings.indexOf(ifNode);
			let key = 0;
			while (i-- >= 0) {
				const sibling = siblings[i];
				if (sibling && sibling.type === 9) key += sibling.branches.length;
			}
			return () => {
				if (isRoot) ifNode.codegenNode = createCodegenNodeForBranch(branch, key, context);
				else {
					const parentCondition = getParentCondition(ifNode.codegenNode);
					parentCondition.alternate = createCodegenNodeForBranch(branch, key + ifNode.branches.length - 1, context);
				}
			};
		});
	});
	transformFor = createStructuralDirectiveTransform("for", (node, dir, context) => {
		const { helper, removeHelper } = context;
		return processFor(node, dir, context, (forNode) => {
			const renderExp = createCallExpression(helper(RENDER_LIST), [forNode.source]);
			const isTemplate = isTemplateNode(node);
			const memo = findDir(node, "memo");
			const keyProp = findProp(node, `key`, false, true);
			keyProp && keyProp.type;
			let keyExp = keyProp && (keyProp.type === 6 ? keyProp.value ? createSimpleExpression(keyProp.value.content, true) : void 0 : keyProp.exp);
			const keyProperty = keyProp && keyExp ? createObjectProperty(`key`, keyExp) : null;
			const isStableFragment = forNode.source.type === 4 && forNode.source.constType > 0;
			const fragmentFlag = isStableFragment ? 64 : keyProp ? 128 : 256;
			forNode.codegenNode = createVNodeCall(context, helper(FRAGMENT), void 0, renderExp, fragmentFlag, void 0, void 0, true, !isStableFragment, false, node.loc);
			return () => {
				let childBlock;
				const { children } = forNode;
				const needFragmentWrapper = children.length !== 1 || children[0].type !== 1;
				const slotOutlet = isSlotOutlet(node) ? node : isTemplate && node.children.length === 1 && isSlotOutlet(node.children[0]) ? node.children[0] : null;
				if (slotOutlet) {
					childBlock = slotOutlet.codegenNode;
					if (isTemplate && keyProperty) injectProp(childBlock, keyProperty, context);
				} else if (needFragmentWrapper) childBlock = createVNodeCall(context, helper(FRAGMENT), keyProperty ? createObjectExpression([keyProperty]) : void 0, node.children, 64, void 0, void 0, true, void 0, false);
				else {
					childBlock = children[0].codegenNode;
					if (isTemplate && keyProperty) injectProp(childBlock, keyProperty, context);
					if (childBlock.isBlock !== !isStableFragment) {
						if (childBlock.isBlock) {
							removeHelper(OPEN_BLOCK);
							removeHelper(getVNodeBlockHelper(context.inSSR, childBlock.isComponent));
						} else removeHelper(getVNodeHelper(context.inSSR, childBlock.isComponent));
					}
					childBlock.isBlock = !isStableFragment;
					if (childBlock.isBlock) {
						helper(OPEN_BLOCK);
						helper(getVNodeBlockHelper(context.inSSR, childBlock.isComponent));
					} else helper(getVNodeHelper(context.inSSR, childBlock.isComponent));
				}
				if (memo) {
					const loop = createFunctionExpression(createForLoopParams(forNode.parseResult, [createSimpleExpression(`_cached`)]));
					loop.body = createBlockStatement([
						createCompoundExpression([
							`const _memo = (`,
							memo.exp,
							`)`
						]),
						createCompoundExpression([
							`if (_cached`,
							...keyExp ? [` && _cached.key === `, keyExp] : [],
							` && ${context.helperString(IS_MEMO_SAME)}(_cached, _memo)) return _cached`
						]),
						createCompoundExpression([`const _item = `, childBlock]),
						createSimpleExpression(`_item.memo = _memo`),
						createSimpleExpression(`return _item`)
					]);
					renderExp.arguments.push(loop, createSimpleExpression(`_cache`), createSimpleExpression(String(context.cached.length)));
					context.cached.push(null);
				} else renderExp.arguments.push(createFunctionExpression(createForLoopParams(forNode.parseResult), childBlock, true));
			};
		});
	});
	defaultFallback = createSimpleExpression(`undefined`, false);
	trackSlotScopes = (node, context) => {
		if (node.type === 1 && (node.tagType === 1 || node.tagType === 3)) {
			const vSlot = findDir(node, "slot");
			if (vSlot) {
				vSlot.exp;
				context.scopes.vSlot++;
				return () => {
					context.scopes.vSlot--;
				};
			}
		}
	};
	trackVForSlotScopes = (node, context) => {
		let vFor;
		if (isTemplateNode(node) && node.props.some(isVSlot) && (vFor = findDir(node, "for"))) {
			const result = vFor.forParseResult;
			if (result) {
				finalizeForParseResult(result, context);
				const { value, key, index } = result;
				const { addIdentifiers, removeIdentifiers } = context;
				value && addIdentifiers(value);
				key && addIdentifiers(key);
				index && addIdentifiers(index);
				return () => {
					value && removeIdentifiers(value);
					key && removeIdentifiers(key);
					index && removeIdentifiers(index);
				};
			}
		}
	};
	buildClientSlotFn = (props, _vForExp, children, loc) => createFunctionExpression(props, children, false, true, children.length ? children[0].loc : loc);
	directiveImportMap = /* @__PURE__ */ new WeakMap();
	transformElement = (node, context) => {
		return function postTransformElement() {
			node = context.currentNode;
			if (!(node.type === 1 && (node.tagType === 0 || node.tagType === 1))) return;
			const { tag, props } = node;
			const isComponent = node.tagType === 1;
			let vnodeTag = isComponent ? resolveComponentType(node, context) : `"${tag}"`;
			const isDynamicComponent = isObject(vnodeTag) && vnodeTag.callee === RESOLVE_DYNAMIC_COMPONENT;
			let vnodeProps;
			let vnodeChildren;
			let patchFlag = 0;
			let vnodeDynamicProps;
			let dynamicPropNames;
			let vnodeDirectives;
			let shouldUseBlock = isDynamicComponent || vnodeTag === TELEPORT || vnodeTag === SUSPENSE || !isComponent && (tag === "svg" || tag === "foreignObject" || tag === "math");
			if (props.length > 0) {
				const propsBuildResult = buildProps(node, context, void 0, isComponent, isDynamicComponent);
				vnodeProps = propsBuildResult.props;
				patchFlag = propsBuildResult.patchFlag;
				dynamicPropNames = propsBuildResult.dynamicPropNames;
				const directives = propsBuildResult.directives;
				vnodeDirectives = directives && directives.length ? createArrayExpression(directives.map((dir) => buildDirectiveArgs(dir, context))) : void 0;
				if (propsBuildResult.shouldUseBlock) shouldUseBlock = true;
			}
			if (node.children.length > 0) {
				if (vnodeTag === KEEP_ALIVE) {
					shouldUseBlock = true;
					patchFlag |= 1024;
				}
				if (isComponent && vnodeTag !== TELEPORT && vnodeTag !== KEEP_ALIVE) {
					const { slots, hasDynamicSlots } = buildSlots(node, context);
					vnodeChildren = slots;
					if (hasDynamicSlots) patchFlag |= 1024;
				} else if (node.children.length === 1 && vnodeTag !== TELEPORT) {
					const child = node.children[0];
					const type = child.type;
					const hasDynamicTextChild = type === 5 || type === 8;
					if (hasDynamicTextChild && getConstantType(child, context) === 0) patchFlag |= 1;
					if (hasDynamicTextChild || type === 2) vnodeChildren = child;
					else vnodeChildren = node.children;
				} else vnodeChildren = node.children;
			}
			if (dynamicPropNames && dynamicPropNames.length) vnodeDynamicProps = stringifyDynamicPropNames(dynamicPropNames);
			node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren, patchFlag === 0 ? void 0 : patchFlag, vnodeDynamicProps, vnodeDirectives, !!shouldUseBlock, false, isComponent, node.loc);
		};
	};
	transformSlotOutlet = (node, context) => {
		if (isSlotOutlet(node)) {
			const { children, loc } = node;
			const { slotName, slotProps } = processSlotOutlet(node, context);
			const slotArgs = [
				context.prefixIdentifiers ? `_ctx.$slots` : `$slots`,
				slotName,
				"{}",
				"undefined",
				"true"
			];
			let expectedLen = 2;
			if (slotProps) {
				slotArgs[2] = slotProps;
				expectedLen = 3;
			}
			if (children.length) {
				slotArgs[3] = createFunctionExpression([], children, false, false, loc);
				expectedLen = 4;
			}
			if (context.scopeId && !context.slotted) expectedLen = 5;
			slotArgs.splice(expectedLen);
			node.codegenNode = createCallExpression(context.helper(RENDER_SLOT), slotArgs, loc);
		}
	};
	transformOn$1 = (dir, node, context, augmentor) => {
		const { loc, modifiers, arg } = dir;
		if (!dir.exp && !modifiers.length) context.onError(createCompilerError(35, loc));
		let eventName;
		if (arg.type === 4) {
			if (arg.isStatic) {
				let rawName = arg.content;
				if (rawName.startsWith("vue:")) rawName = `vnode-${rawName.slice(4)}`;
				eventName = createSimpleExpression(node.tagType !== 0 || rawName.startsWith("vnode") || !/[A-Z]/.test(rawName) ? toHandlerKey(camelize(rawName)) : `on:${rawName}`, true, arg.loc);
			} else eventName = createCompoundExpression([
				`${context.helperString(TO_HANDLER_KEY)}(`,
				arg,
				`)`
			]);
		} else {
			eventName = arg;
			eventName.children.unshift(`${context.helperString(TO_HANDLER_KEY)}(`);
			eventName.children.push(`)`);
		}
		let exp = dir.exp;
		if (exp && !exp.content.trim()) exp = void 0;
		let shouldCache = context.cacheHandlers && !exp && !context.inVOnce;
		if (exp) {
			const isMemberExp = isMemberExpression(exp);
			const isInlineStatement = !(isMemberExp || isFnExpression(exp));
			const hasMultipleStatements = exp.content.includes(`;`);
			if (isInlineStatement || shouldCache && isMemberExp) exp = createCompoundExpression([
				`${isInlineStatement ? `$event` : `(...args)`} => ${hasMultipleStatements ? `{` : `(`}`,
				exp,
				hasMultipleStatements ? `}` : `)`
			]);
		}
		let ret = { props: [createObjectProperty(eventName, exp || createSimpleExpression(`() => {}`, false, loc))] };
		if (augmentor) ret = augmentor(ret);
		if (shouldCache) ret.props[0].value = context.cache(ret.props[0].value);
		ret.props.forEach((p) => p.key.isHandlerKey = true);
		return ret;
	};
	transformBind = (dir, _node, context) => {
		const { modifiers, loc } = dir;
		const arg = dir.arg;
		let { exp } = dir;
		if (exp && exp.type === 4 && !exp.content.trim()) exp = void 0;
		if (arg.type !== 4) {
			arg.children.unshift(`(`);
			arg.children.push(`) || ""`);
		} else if (!arg.isStatic) arg.content = arg.content ? `${arg.content} || ""` : `""`;
		if (modifiers.some((mod) => mod.content === "camel")) {
			if (arg.type === 4) {
				if (arg.isStatic) arg.content = camelize(arg.content);
				else arg.content = `${context.helperString(CAMELIZE)}(${arg.content})`;
			} else {
				arg.children.unshift(`${context.helperString(CAMELIZE)}(`);
				arg.children.push(`)`);
			}
		}
		if (!context.inSSR) {
			if (modifiers.some((mod) => mod.content === "prop")) injectPrefix(arg, ".");
			if (modifiers.some((mod) => mod.content === "attr")) injectPrefix(arg, "^");
		}
		return { props: [createObjectProperty(arg, exp)] };
	};
	injectPrefix = (arg, prefix) => {
		if (arg.type === 4) {
			if (arg.isStatic) arg.content = prefix + arg.content;
			else arg.content = `\`${prefix}\${${arg.content}}\``;
		} else {
			arg.children.unshift(`'${prefix}' + (`);
			arg.children.push(`)`);
		}
	};
	transformText = (node, context) => {
		if (node.type === 0 || node.type === 1 || node.type === 11 || node.type === 10) return () => {
			const children = node.children;
			let currentContainer = void 0;
			let hasText = false;
			for (let i = 0; i < children.length; i++) {
				const child = children[i];
				if (isText$1(child)) {
					hasText = true;
					for (let j = i + 1; j < children.length; j++) {
						const next = children[j];
						if (isText$1(next)) {
							if (!currentContainer) currentContainer = children[i] = createCompoundExpression([child], child.loc);
							currentContainer.children.push(` + `, next);
							children.splice(j, 1);
							j--;
						} else {
							currentContainer = void 0;
							break;
						}
					}
				}
			}
			if (!hasText || children.length === 1 && (node.type === 0 || node.type === 1 && node.tagType === 0 && !node.props.find((p) => p.type === 7 && !context.directiveTransforms[p.name]) && !(node.tag === "template"))) return;
			for (let i = 0; i < children.length; i++) {
				const child = children[i];
				if (isText$1(child) || child.type === 8) {
					const callArgs = [];
					if (child.type !== 2 || child.content !== " ") callArgs.push(child);
					if (!context.ssr && getConstantType(child, context) === 0) callArgs.push("1");
					children[i] = {
						type: 12,
						content: child,
						loc: child.loc,
						codegenNode: createCallExpression(context.helper(CREATE_TEXT), callArgs)
					};
				}
			}
		};
	};
	seen$1 = /* @__PURE__ */ new WeakSet();
	transformOnce = (node, context) => {
		if (node.type === 1 && findDir(node, "once", true)) {
			if (seen$1.has(node) || context.inVOnce || context.inSSR) return;
			seen$1.add(node);
			context.inVOnce = true;
			context.helper(SET_BLOCK_TRACKING);
			return () => {
				context.inVOnce = false;
				const cur = context.currentNode;
				if (cur.codegenNode) cur.codegenNode = context.cache(cur.codegenNode, true, true);
			};
		}
	};
	transformModel$1 = (dir, node, context) => {
		const { exp, arg } = dir;
		if (!exp) {
			context.onError(createCompilerError(41, dir.loc));
			return createTransformProps();
		}
		const rawExp = exp.loc.source.trim();
		const expString = exp.type === 4 ? exp.content : rawExp;
		const bindingType = context.bindingMetadata[rawExp];
		if (bindingType === "props" || bindingType === "props-aliased") {
			context.onError(createCompilerError(44, exp.loc));
			return createTransformProps();
		}
		if (bindingType === "literal-const" || bindingType === "setup-const") {
			context.onError(createCompilerError(45, exp.loc));
			return createTransformProps();
		}
		if (!expString.trim() || !isMemberExpression(exp) && true) {
			context.onError(createCompilerError(42, exp.loc));
			return createTransformProps();
		}
		const propName = arg ? arg : createSimpleExpression("modelValue", true);
		const eventName = arg ? isStaticExp(arg) ? `onUpdate:${camelize(arg.content)}` : createCompoundExpression(["\"onUpdate:\" + ", arg]) : `onUpdate:modelValue`;
		let assignmentExp;
		assignmentExp = createCompoundExpression([
			`${context.isTS ? `($event: any)` : `$event`} => ((`,
			exp,
			`) = $event)`
		]);
		const props = [createObjectProperty(propName, dir.exp), createObjectProperty(eventName, assignmentExp)];
		if (dir.modifiers.length && node.tagType === 1) {
			const modifiers = dir.modifiers.map((m) => m.content).map((m) => (isSimpleIdentifier(m) ? m : JSON.stringify(m)) + `: true`).join(`, `);
			const modifiersKey = arg ? isStaticExp(arg) ? `${arg.content}Modifiers` : createCompoundExpression([arg, " + \"Modifiers\""]) : `modelModifiers`;
			props.push(createObjectProperty(modifiersKey, createSimpleExpression(`{ ${modifiers} }`, false, dir.loc, 2)));
		}
		return createTransformProps(props);
	};
	validDivisionCharRE = /[\w).+\-_$\]]/;
	transformFilter = (node, context) => {
		if (!isCompatEnabled("COMPILER_FILTERS", context)) return;
		if (node.type === 5) rewriteFilter(node.content, context);
		else if (node.type === 1) node.props.forEach((prop) => {
			if (prop.type === 7 && prop.name !== "for" && prop.exp) rewriteFilter(prop.exp, context);
		});
	};
	seen = /* @__PURE__ */ new WeakSet();
	transformMemo = (node, context) => {
		if (node.type === 1) {
			const dir = findDir(node, "memo");
			if (!dir || seen.has(node) || context.inSSR) return;
			seen.add(node);
			return () => {
				const codegenNode = node.codegenNode || context.currentNode.codegenNode;
				if (codegenNode && codegenNode.type === 13) {
					if (node.tagType !== 1) convertToBlock(codegenNode, context);
					node.codegenNode = createCallExpression(context.helper(WITH_MEMO), [
						dir.exp,
						createFunctionExpression(void 0, codegenNode),
						`_cache`,
						String(context.cached.length)
					]);
					context.cached.push(null);
				}
			};
		}
	};
	transformVBindShorthand = (node, context) => {
		if (node.type === 1) {
			for (const prop of node.props) if (prop.type === 7 && prop.name === "bind" && (!prop.exp || prop.exp.type === 4 && !prop.exp.content.trim()) && prop.arg) {
				const arg = prop.arg;
				if (arg.type !== 4 || !arg.isStatic) {
					context.onError(createCompilerError(53, arg.loc));
					prop.exp = createSimpleExpression("", true, arg.loc);
				} else {
					const propName = camelize(arg.content);
					if (validFirstIdentCharRE.test(propName[0]) || propName[0] === "-") prop.exp = createSimpleExpression(propName, false, arg.loc);
				}
			}
		}
	};
	BindingTypes = {
		"DATA": "data",
		"PROPS": "props",
		"PROPS_ALIASED": "props-aliased",
		"SETUP_LET": "setup-let",
		"SETUP_CONST": "setup-const",
		"SETUP_REACTIVE_CONST": "setup-reactive-const",
		"SETUP_MAYBE_REF": "setup-maybe-ref",
		"SETUP_REF": "setup-ref",
		"OPTIONS": "options",
		"LITERAL_CONST": "literal-const"
	};
	noopDirectiveTransform = () => ({ props: [] });
}));
//#endregion
//#region ../../../node_modules/.pnpm/@vue+compiler-dom@3.5.26/node_modules/@vue/compiler-dom/dist/compiler-dom.esm-bundler.js
var compiler_dom_esm_bundler_exports = /* @__PURE__ */ __exportAll({
	BASE_TRANSITION: () => BASE_TRANSITION,
	BindingTypes: () => BindingTypes,
	CAMELIZE: () => CAMELIZE,
	CAPITALIZE: () => CAPITALIZE,
	CREATE_BLOCK: () => CREATE_BLOCK,
	CREATE_COMMENT: () => CREATE_COMMENT,
	CREATE_ELEMENT_BLOCK: () => CREATE_ELEMENT_BLOCK,
	CREATE_ELEMENT_VNODE: () => CREATE_ELEMENT_VNODE,
	CREATE_SLOTS: () => CREATE_SLOTS,
	CREATE_STATIC: () => CREATE_STATIC,
	CREATE_TEXT: () => CREATE_TEXT,
	CREATE_VNODE: () => CREATE_VNODE,
	CompilerDeprecationTypes: () => CompilerDeprecationTypes,
	ConstantTypes: () => ConstantTypes,
	DOMDirectiveTransforms: () => DOMDirectiveTransforms,
	DOMErrorCodes: () => DOMErrorCodes,
	DOMErrorMessages: () => DOMErrorMessages,
	DOMNodeTransforms: () => DOMNodeTransforms,
	ElementTypes: () => ElementTypes,
	ErrorCodes: () => ErrorCodes,
	FRAGMENT: () => FRAGMENT,
	GUARD_REACTIVE_PROPS: () => GUARD_REACTIVE_PROPS,
	IS_MEMO_SAME: () => IS_MEMO_SAME,
	IS_REF: () => IS_REF,
	KEEP_ALIVE: () => KEEP_ALIVE,
	MERGE_PROPS: () => MERGE_PROPS,
	NORMALIZE_CLASS: () => NORMALIZE_CLASS,
	NORMALIZE_PROPS: () => NORMALIZE_PROPS,
	NORMALIZE_STYLE: () => NORMALIZE_STYLE,
	Namespaces: () => Namespaces,
	NodeTypes: () => NodeTypes,
	OPEN_BLOCK: () => OPEN_BLOCK,
	POP_SCOPE_ID: () => POP_SCOPE_ID,
	PUSH_SCOPE_ID: () => PUSH_SCOPE_ID,
	RENDER_LIST: () => RENDER_LIST,
	RENDER_SLOT: () => RENDER_SLOT,
	RESOLVE_COMPONENT: () => RESOLVE_COMPONENT,
	RESOLVE_DIRECTIVE: () => RESOLVE_DIRECTIVE,
	RESOLVE_DYNAMIC_COMPONENT: () => RESOLVE_DYNAMIC_COMPONENT,
	RESOLVE_FILTER: () => RESOLVE_FILTER,
	SET_BLOCK_TRACKING: () => SET_BLOCK_TRACKING,
	SUSPENSE: () => SUSPENSE,
	TELEPORT: () => TELEPORT,
	TO_DISPLAY_STRING: () => TO_DISPLAY_STRING,
	TO_HANDLERS: () => TO_HANDLERS,
	TO_HANDLER_KEY: () => TO_HANDLER_KEY,
	TRANSITION: () => TRANSITION,
	TRANSITION_GROUP: () => TRANSITION_GROUP,
	TS_NODE_TYPES: () => TS_NODE_TYPES,
	UNREF: () => UNREF,
	V_MODEL_CHECKBOX: () => V_MODEL_CHECKBOX,
	V_MODEL_DYNAMIC: () => V_MODEL_DYNAMIC,
	V_MODEL_RADIO: () => V_MODEL_RADIO,
	V_MODEL_SELECT: () => V_MODEL_SELECT,
	V_MODEL_TEXT: () => V_MODEL_TEXT,
	V_ON_WITH_KEYS: () => V_ON_WITH_KEYS,
	V_ON_WITH_MODIFIERS: () => V_ON_WITH_MODIFIERS,
	V_SHOW: () => V_SHOW,
	WITH_CTX: () => WITH_CTX,
	WITH_DIRECTIVES: () => WITH_DIRECTIVES,
	WITH_MEMO: () => WITH_MEMO,
	advancePositionWithClone: () => advancePositionWithClone,
	advancePositionWithMutation: () => advancePositionWithMutation,
	assert: () => assert,
	baseCompile: () => baseCompile,
	baseParse: () => baseParse,
	buildDirectiveArgs: () => buildDirectiveArgs,
	buildProps: () => buildProps,
	buildSlots: () => buildSlots,
	checkCompatEnabled: () => checkCompatEnabled,
	compile: () => compile,
	convertToBlock: () => convertToBlock,
	createArrayExpression: () => createArrayExpression,
	createAssignmentExpression: () => createAssignmentExpression,
	createBlockStatement: () => createBlockStatement,
	createCacheExpression: () => createCacheExpression,
	createCallExpression: () => createCallExpression,
	createCompilerError: () => createCompilerError,
	createCompoundExpression: () => createCompoundExpression,
	createConditionalExpression: () => createConditionalExpression,
	createDOMCompilerError: () => createDOMCompilerError,
	createForLoopParams: () => createForLoopParams,
	createFunctionExpression: () => createFunctionExpression,
	createIfStatement: () => createIfStatement,
	createInterpolation: () => createInterpolation,
	createObjectExpression: () => createObjectExpression,
	createObjectProperty: () => createObjectProperty,
	createReturnStatement: () => createReturnStatement,
	createRoot: () => createRoot,
	createSequenceExpression: () => createSequenceExpression,
	createSimpleExpression: () => createSimpleExpression,
	createStructuralDirectiveTransform: () => createStructuralDirectiveTransform,
	createTemplateLiteral: () => createTemplateLiteral,
	createTransformContext: () => createTransformContext,
	createVNodeCall: () => createVNodeCall,
	errorMessages: () => errorMessages,
	extractIdentifiers: () => extractIdentifiers,
	findDir: () => findDir,
	findProp: () => findProp,
	forAliasRE: () => forAliasRE,
	generate: () => generate,
	generateCodeFrame: () => generateCodeFrame,
	getBaseTransformPreset: () => getBaseTransformPreset,
	getConstantType: () => getConstantType,
	getMemoedVNodeCall: () => getMemoedVNodeCall,
	getVNodeBlockHelper: () => getVNodeBlockHelper,
	getVNodeHelper: () => getVNodeHelper,
	hasDynamicKeyVBind: () => hasDynamicKeyVBind,
	hasScopeRef: () => hasScopeRef,
	helperNameMap: () => helperNameMap,
	injectProp: () => injectProp,
	isAllWhitespace: () => isAllWhitespace,
	isCommentOrWhitespace: () => isCommentOrWhitespace,
	isCoreComponent: () => isCoreComponent,
	isFnExpression: () => isFnExpression,
	isFnExpressionBrowser: () => isFnExpressionBrowser,
	isFnExpressionNode: () => isFnExpressionNode,
	isFunctionType: () => isFunctionType,
	isInDestructureAssignment: () => isInDestructureAssignment,
	isInNewExpression: () => isInNewExpression,
	isMemberExpression: () => isMemberExpression,
	isMemberExpressionBrowser: () => isMemberExpressionBrowser,
	isMemberExpressionNode: () => isMemberExpressionNode,
	isReferencedIdentifier: () => isReferencedIdentifier,
	isSimpleIdentifier: () => isSimpleIdentifier,
	isSlotOutlet: () => isSlotOutlet,
	isStaticArgOf: () => isStaticArgOf,
	isStaticExp: () => isStaticExp,
	isStaticProperty: () => isStaticProperty,
	isStaticPropertyKey: () => isStaticPropertyKey,
	isTemplateNode: () => isTemplateNode,
	isText: () => isText$1,
	isVPre: () => isVPre,
	isVSlot: () => isVSlot,
	isWhitespaceText: () => isWhitespaceText,
	locStub: () => locStub,
	noopDirectiveTransform: () => noopDirectiveTransform,
	parse: () => parse,
	parserOptions: () => parserOptions,
	processExpression: () => processExpression,
	processFor: () => processFor,
	processIf: () => processIf,
	processSlotOutlet: () => processSlotOutlet,
	registerRuntimeHelpers: () => registerRuntimeHelpers,
	resolveComponentType: () => resolveComponentType,
	stringifyExpression: () => stringifyExpression,
	toValidAssetId: () => toValidAssetId,
	trackSlotScopes: () => trackSlotScopes,
	trackVForSlotScopes: () => trackVForSlotScopes,
	transform: () => transform,
	transformBind: () => transformBind,
	transformElement: () => transformElement,
	transformExpression: () => transformExpression,
	transformModel: () => transformModel$1,
	transformOn: () => transformOn$1,
	transformStyle: () => transformStyle,
	transformVBindShorthand: () => transformVBindShorthand,
	traverseNode: () => traverseNode,
	unwrapTSNode: () => unwrapTSNode,
	validFirstIdentCharRE: () => validFirstIdentCharRE,
	walkBlockDeclarations: () => walkBlockDeclarations,
	walkFunctionParams: () => walkFunctionParams,
	walkIdentifiers: () => walkIdentifiers,
	warnDeprecation: () => warnDeprecation
});
/**
* @vue/compiler-dom v3.5.26
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
function decodeHtmlBrowser(raw, asAttr = false) {
	if (!decoder) decoder = document.createElement("div");
	if (asAttr) {
		decoder.innerHTML = `<div foo="${raw.replace(/"/g, "&quot;")}">`;
		return decoder.children[0].getAttribute("foo");
	} else {
		decoder.innerHTML = raw;
		return decoder.textContent;
	}
}
function createDOMCompilerError(code, loc) {
	return createCompilerError(code, loc, void 0);
}
function compile(src, options = {}) {
	return baseCompile(src, extend({}, parserOptions, options, {
		nodeTransforms: [
			ignoreSideEffectTags,
			...DOMNodeTransforms,
			...options.nodeTransforms || []
		],
		directiveTransforms: extend({}, DOMDirectiveTransforms, options.directiveTransforms || {}),
		transformHoist: null
	}));
}
function parse(template, options = {}) {
	return baseParse(template, extend({}, parserOptions, options));
}
var V_MODEL_RADIO, V_MODEL_CHECKBOX, V_MODEL_TEXT, V_MODEL_SELECT, V_MODEL_DYNAMIC, V_ON_WITH_MODIFIERS, V_ON_WITH_KEYS, V_SHOW, TRANSITION, TRANSITION_GROUP, decoder, parserOptions, transformStyle, parseInlineCSS, DOMErrorCodes, DOMErrorMessages, transformVHtml, transformVText, transformModel, isEventOptionModifier, isNonKeyModifier, maybeKeyModifier, isKeyboardEvent, resolveModifiers, transformClick, transformOn, transformShow, ignoreSideEffectTags, DOMNodeTransforms, DOMDirectiveTransforms;
var init_compiler_dom_esm_bundler = __esmMin((() => {
	init_compiler_core_esm_bundler();
	init_compiler_core_esm_bundler();
	init_shared_esm_bundler();
	V_MODEL_RADIO = /* @__PURE__ */ Symbol(``);
	V_MODEL_CHECKBOX = /* @__PURE__ */ Symbol(``);
	V_MODEL_TEXT = /* @__PURE__ */ Symbol(``);
	V_MODEL_SELECT = /* @__PURE__ */ Symbol(``);
	V_MODEL_DYNAMIC = /* @__PURE__ */ Symbol(``);
	V_ON_WITH_MODIFIERS = /* @__PURE__ */ Symbol(``);
	V_ON_WITH_KEYS = /* @__PURE__ */ Symbol(``);
	V_SHOW = /* @__PURE__ */ Symbol(``);
	TRANSITION = /* @__PURE__ */ Symbol(``);
	TRANSITION_GROUP = /* @__PURE__ */ Symbol(``);
	registerRuntimeHelpers({
		[V_MODEL_RADIO]: `vModelRadio`,
		[V_MODEL_CHECKBOX]: `vModelCheckbox`,
		[V_MODEL_TEXT]: `vModelText`,
		[V_MODEL_SELECT]: `vModelSelect`,
		[V_MODEL_DYNAMIC]: `vModelDynamic`,
		[V_ON_WITH_MODIFIERS]: `withModifiers`,
		[V_ON_WITH_KEYS]: `withKeys`,
		[V_SHOW]: `vShow`,
		[TRANSITION]: `Transition`,
		[TRANSITION_GROUP]: `TransitionGroup`
	});
	parserOptions = {
		parseMode: "html",
		isVoidTag,
		isNativeTag: (tag) => isHTMLTag(tag) || isSVGTag(tag) || isMathMLTag(tag),
		isPreTag: (tag) => tag === "pre",
		isIgnoreNewlineTag: (tag) => tag === "pre" || tag === "textarea",
		decodeEntities: decodeHtmlBrowser,
		isBuiltInComponent: (tag) => {
			if (tag === "Transition" || tag === "transition") return TRANSITION;
			else if (tag === "TransitionGroup" || tag === "transition-group") return TRANSITION_GROUP;
		},
		getNamespace(tag, parent, rootNamespace) {
			let ns = parent ? parent.ns : rootNamespace;
			if (parent && ns === 2) {
				if (parent.tag === "annotation-xml") {
					if (tag === "svg") return 1;
					if (parent.props.some((a) => a.type === 6 && a.name === "encoding" && a.value != null && (a.value.content === "text/html" || a.value.content === "application/xhtml+xml"))) ns = 0;
				} else if (/^m(?:[ions]|text)$/.test(parent.tag) && tag !== "mglyph" && tag !== "malignmark") ns = 0;
			} else if (parent && ns === 1) {
				if (parent.tag === "foreignObject" || parent.tag === "desc" || parent.tag === "title") ns = 0;
			}
			if (ns === 0) {
				if (tag === "svg") return 1;
				if (tag === "math") return 2;
			}
			return ns;
		}
	};
	transformStyle = (node) => {
		if (node.type === 1) node.props.forEach((p, i) => {
			if (p.type === 6 && p.name === "style" && p.value) node.props[i] = {
				type: 7,
				name: `bind`,
				arg: createSimpleExpression(`style`, true, p.loc),
				exp: parseInlineCSS(p.value.content, p.loc),
				modifiers: [],
				loc: p.loc
			};
		});
	};
	parseInlineCSS = (cssText, loc) => {
		const normalized = parseStringStyle(cssText);
		return createSimpleExpression(JSON.stringify(normalized), false, loc, 3);
	};
	DOMErrorCodes = {
		"X_V_HTML_NO_EXPRESSION": 54,
		"54": "X_V_HTML_NO_EXPRESSION",
		"X_V_HTML_WITH_CHILDREN": 55,
		"55": "X_V_HTML_WITH_CHILDREN",
		"X_V_TEXT_NO_EXPRESSION": 56,
		"56": "X_V_TEXT_NO_EXPRESSION",
		"X_V_TEXT_WITH_CHILDREN": 57,
		"57": "X_V_TEXT_WITH_CHILDREN",
		"X_V_MODEL_ON_INVALID_ELEMENT": 58,
		"58": "X_V_MODEL_ON_INVALID_ELEMENT",
		"X_V_MODEL_ARG_ON_ELEMENT": 59,
		"59": "X_V_MODEL_ARG_ON_ELEMENT",
		"X_V_MODEL_ON_FILE_INPUT_ELEMENT": 60,
		"60": "X_V_MODEL_ON_FILE_INPUT_ELEMENT",
		"X_V_MODEL_UNNECESSARY_VALUE": 61,
		"61": "X_V_MODEL_UNNECESSARY_VALUE",
		"X_V_SHOW_NO_EXPRESSION": 62,
		"62": "X_V_SHOW_NO_EXPRESSION",
		"X_TRANSITION_INVALID_CHILDREN": 63,
		"63": "X_TRANSITION_INVALID_CHILDREN",
		"X_IGNORED_SIDE_EFFECT_TAG": 64,
		"64": "X_IGNORED_SIDE_EFFECT_TAG",
		"__EXTEND_POINT__": 65,
		"65": "__EXTEND_POINT__"
	};
	DOMErrorMessages = {
		[54]: `v-html is missing expression.`,
		[55]: `v-html will override element children.`,
		[56]: `v-text is missing expression.`,
		[57]: `v-text will override element children.`,
		[58]: `v-model can only be used on <input>, <textarea> and <select> elements.`,
		[59]: `v-model argument is not supported on plain elements.`,
		[60]: `v-model cannot be used on file inputs since they are read-only. Use a v-on:change listener instead.`,
		[61]: `Unnecessary value binding used alongside v-model. It will interfere with v-model's behavior.`,
		[62]: `v-show is missing expression.`,
		[63]: `<Transition> expects exactly one child element or component.`,
		[64]: `Tags with side effect (<script> and <style>) are ignored in client component templates.`
	};
	transformVHtml = (dir, node, context) => {
		const { exp, loc } = dir;
		if (!exp) context.onError(createDOMCompilerError(54, loc));
		if (node.children.length) {
			context.onError(createDOMCompilerError(55, loc));
			node.children.length = 0;
		}
		return { props: [createObjectProperty(createSimpleExpression(`innerHTML`, true, loc), exp || createSimpleExpression("", true))] };
	};
	transformVText = (dir, node, context) => {
		const { exp, loc } = dir;
		if (!exp) context.onError(createDOMCompilerError(56, loc));
		if (node.children.length) {
			context.onError(createDOMCompilerError(57, loc));
			node.children.length = 0;
		}
		return { props: [createObjectProperty(createSimpleExpression(`textContent`, true), exp ? getConstantType(exp, context) > 0 ? exp : createCallExpression(context.helperString(TO_DISPLAY_STRING), [exp], loc) : createSimpleExpression("", true))] };
	};
	transformModel = (dir, node, context) => {
		const baseResult = transformModel$1(dir, node, context);
		if (!baseResult.props.length || node.tagType === 1) return baseResult;
		if (dir.arg) context.onError(createDOMCompilerError(59, dir.arg.loc));
		const { tag } = node;
		const isCustomElement = context.isCustomElement(tag);
		if (tag === "input" || tag === "textarea" || tag === "select" || isCustomElement) {
			let directiveToUse = V_MODEL_TEXT;
			let isInvalidType = false;
			if (tag === "input" || isCustomElement) {
				const type = findProp(node, `type`);
				if (type) {
					if (type.type === 7) directiveToUse = V_MODEL_DYNAMIC;
					else if (type.value) switch (type.value.content) {
						case "radio":
							directiveToUse = V_MODEL_RADIO;
							break;
						case "checkbox":
							directiveToUse = V_MODEL_CHECKBOX;
							break;
						case "file":
							isInvalidType = true;
							context.onError(createDOMCompilerError(60, dir.loc));
					}
				} else if (hasDynamicKeyVBind(node)) directiveToUse = V_MODEL_DYNAMIC;
			} else if (tag === "select") directiveToUse = V_MODEL_SELECT;
			if (!isInvalidType) baseResult.needRuntime = context.helper(directiveToUse);
		} else context.onError(createDOMCompilerError(58, dir.loc));
		baseResult.props = baseResult.props.filter((p) => !(p.key.type === 4 && p.key.content === "modelValue"));
		return baseResult;
	};
	isEventOptionModifier = /* @__PURE__ */ makeMap(`passive,once,capture`);
	isNonKeyModifier = /* @__PURE__ */ makeMap(`stop,prevent,self,ctrl,shift,alt,meta,exact,middle`);
	maybeKeyModifier = /* @__PURE__ */ makeMap("left,right");
	isKeyboardEvent = /* @__PURE__ */ makeMap(`onkeyup,onkeydown,onkeypress`);
	resolveModifiers = (key, modifiers, context, loc) => {
		const keyModifiers = [];
		const nonKeyModifiers = [];
		const eventOptionModifiers = [];
		for (let i = 0; i < modifiers.length; i++) {
			const modifier = modifiers[i].content;
			if (modifier === "native" && checkCompatEnabled("COMPILER_V_ON_NATIVE", context, loc)) eventOptionModifiers.push(modifier);
			else if (isEventOptionModifier(modifier)) eventOptionModifiers.push(modifier);
			else if (maybeKeyModifier(modifier)) {
				if (isStaticExp(key)) {
					if (isKeyboardEvent(key.content.toLowerCase())) keyModifiers.push(modifier);
					else nonKeyModifiers.push(modifier);
				} else {
					keyModifiers.push(modifier);
					nonKeyModifiers.push(modifier);
				}
			} else if (isNonKeyModifier(modifier)) nonKeyModifiers.push(modifier);
			else keyModifiers.push(modifier);
		}
		return {
			keyModifiers,
			nonKeyModifiers,
			eventOptionModifiers
		};
	};
	transformClick = (key, event) => {
		return isStaticExp(key) && key.content.toLowerCase() === "onclick" ? createSimpleExpression(event, true) : key.type !== 4 ? createCompoundExpression([
			`(`,
			key,
			`) === "onClick" ? "${event}" : (`,
			key,
			`)`
		]) : key;
	};
	transformOn = (dir, node, context) => {
		return transformOn$1(dir, node, context, (baseResult) => {
			const { modifiers } = dir;
			if (!modifiers.length) return baseResult;
			let { key, value: handlerExp } = baseResult.props[0];
			const { keyModifiers, nonKeyModifiers, eventOptionModifiers } = resolveModifiers(key, modifiers, context, dir.loc);
			if (nonKeyModifiers.includes("right")) key = transformClick(key, `onContextmenu`);
			if (nonKeyModifiers.includes("middle")) key = transformClick(key, `onMouseup`);
			if (nonKeyModifiers.length) handlerExp = createCallExpression(context.helper(V_ON_WITH_MODIFIERS), [handlerExp, JSON.stringify(nonKeyModifiers)]);
			if (keyModifiers.length && (!isStaticExp(key) || isKeyboardEvent(key.content.toLowerCase()))) handlerExp = createCallExpression(context.helper(V_ON_WITH_KEYS), [handlerExp, JSON.stringify(keyModifiers)]);
			if (eventOptionModifiers.length) {
				const modifierPostfix = eventOptionModifiers.map(capitalize).join("");
				key = isStaticExp(key) ? createSimpleExpression(`${key.content}${modifierPostfix}`, true) : createCompoundExpression([
					`(`,
					key,
					`) + "${modifierPostfix}"`
				]);
			}
			return { props: [createObjectProperty(key, handlerExp)] };
		});
	};
	transformShow = (dir, node, context) => {
		const { exp, loc } = dir;
		if (!exp) context.onError(createDOMCompilerError(62, loc));
		return {
			props: [],
			needRuntime: context.helper(V_SHOW)
		};
	};
	ignoreSideEffectTags = (node, context) => {
		if (node.type === 1 && node.tagType === 0 && (node.tag === "script" || node.tag === "style")) context.removeNode();
	};
	DOMNodeTransforms = [transformStyle, ...[]];
	DOMDirectiveTransforms = {
		cloak: noopDirectiveTransform,
		html: transformVHtml,
		text: transformVText,
		model: transformModel,
		on: transformOn,
		show: transformShow
	};
}));
//#endregion
//#region ../../../node_modules/.pnpm/vue@3.5.26_typescript@6.0.2/node_modules/vue/dist/vue.cjs.prod.js
/**
* vue v3.5.26
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
var require_vue_cjs_prod = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var compilerDom = (init_compiler_dom_esm_bundler(), __toCommonJS(compiler_dom_esm_bundler_exports));
	var runtimeDom = (init_runtime_dom_esm_bundler(), __toCommonJS(runtime_dom_esm_bundler_exports));
	var shared = (init_shared_esm_bundler(), __toCommonJS(shared_esm_bundler_exports));
	function _interopNamespaceDefault(e) {
		var n = Object.create(null);
		if (e) for (var k in e) n[k] = e[k];
		n.default = e;
		return Object.freeze(n);
	}
	var runtimeDom__namespace = /*#__PURE__*/ _interopNamespaceDefault(runtimeDom);
	var compileCache = /* @__PURE__ */ Object.create(null);
	function compileToFunction(template, options) {
		if (!shared.isString(template)) {
			if (template.nodeType) template = template.innerHTML;
			else return shared.NOOP;
		}
		const key = shared.genCacheKey(template, options);
		const cached = compileCache[key];
		if (cached) return cached;
		if (template[0] === "#") {
			const el = document.querySelector(template);
			template = el ? el.innerHTML : ``;
		}
		const opts = shared.extend({
			hoistStatic: true,
			onError: void 0,
			onWarn: shared.NOOP
		}, options);
		if (!opts.isCustomElement && typeof customElements !== "undefined") opts.isCustomElement = (tag) => !!customElements.get(tag);
		const { code } = compilerDom.compile(template, opts);
		const render = new Function("Vue", code)(runtimeDom__namespace);
		render._rc = true;
		return compileCache[key] = render;
	}
	runtimeDom.registerRuntimeCompiler(compileToFunction);
	exports.compile = compileToFunction;
	Object.keys(runtimeDom).forEach(function(k) {
		if (k !== "default" && !Object.prototype.hasOwnProperty.call(exports, k)) exports[k] = runtimeDom[k];
	});
}));
//#endregion
//#region ../../../node_modules/.pnpm/vue@3.5.26_typescript@6.0.2/node_modules/vue/index.js
var require_vue = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require_vue_cjs_prod();
}));
//#endregion
//#region ../../../node_modules/.pnpm/v3-infinite-loading@1.2.2/node_modules/v3-infinite-loading/lib/v3-infinite-loading.umd.js
var require_v3_infinite_loading_umd = /* @__PURE__ */ __commonJSMin(((exports, module, this$1) => {
	(function(s, e) {
		typeof exports == "object" && typeof module < "u" ? e(exports, require_vue()) : typeof define == "function" && define.amd ? define(["exports", "vue"], e) : (s = typeof globalThis < "u" ? globalThis : s || self, e(s.V3InfiniteLoading = {}, s.Vue));
	})(this$1, function(s, e) {
		"use strict";
		const f = (t, i) => {
			const n = t.__vccOpts || t;
			for (const [o, c] of i) n[o] = c;
			return n;
		}, g = {}, y = (t) => (e.pushScopeId("data-v-259be2b2"), t = t(), e.popScopeId(), t), h = { class: "container" }, b = [y(() => e.createElementVNode("div", { class: "spinner" }, null, -1))];
		function E(t, i) {
			return e.openBlock(), e.createElementBlock("div", h, b);
		}
		const S = f(g, [
			["render", E],
			["__scopeId", "data-v-259be2b2"],
			["__file", "/home/oumoussa/side-projects/infinite/src/components/Spinner.vue"]
		]), x = (t) => ({
			loading() {
				t.value = "loading";
			},
			loaded() {
				t.value = "loaded";
			},
			complete() {
				t.value = "complete";
			},
			error() {
				t.value = "error";
			}
		}), v = (t, i, n) => () => {
			n.prevHeight = (n.parentEl || document.documentElement).scrollHeight, i.loading(), t("infinite", i);
		}, I = (t, i) => {
			const n = t.getBoundingClientRect();
			if (!i) return n.top >= 0 && n.bottom <= window.innerHeight;
			const o = i.getBoundingClientRect();
			return n.top >= o.top && n.bottom <= o.bottom;
		}, u = (t) => {
			t.parentEl = document.querySelector(t.target) || null;
			let i = `0px 0px ${t.distance}px 0px`;
			t.top && (i = `${t.distance}px 0px 0px 0px`);
			const n = new IntersectionObserver((o) => {
				o[0].isIntersecting && (t.firstload && t.emit(), t.firstload = !0);
			}, {
				root: t.parentEl,
				rootMargin: i
			});
			return n.observe(t.infiniteLoading.value), n;
		}, k = { class: "state-error" };
		s.default = f({
			__name: "InfiniteLoading",
			props: {
				top: {
					type: Boolean,
					required: !1
				},
				target: {
					type: [String, Boolean],
					required: !1
				},
				distance: {
					type: Number,
					required: !1,
					default: 0
				},
				identifier: { required: !1 },
				firstload: {
					type: Boolean,
					required: !1,
					default: !0
				},
				slots: {
					type: Object,
					required: !1
				}
			},
			emits: ["infinite"],
			setup(t, { emit: i }) {
				const n = t;
				let o = null;
				const c = e.ref(null), d = e.ref("ready"), { top: _, firstload: V, target: B, distance: q } = n, { identifier: m } = e.toRefs(n), r = {
					infiniteLoading: c,
					target: B,
					top: _,
					firstload: V,
					distance: q,
					prevHeight: 0,
					parentEl: null
				};
				r.emit = v(i, x(d), r);
				const L = () => e.watch(d, async (l) => {
					const a = r.parentEl || document.documentElement;
					await e.nextTick(), l == "loaded" && _ && (a.scrollTop = a.scrollHeight - r.prevHeight), l == "loaded" && I(c.value, r.parentEl) && r.emit(), l == "complete" && o.disconnect();
				}), w = () => e.watch(m, () => {
					d.value = "ready", o.disconnect(), o = u(r);
				});
				return e.onMounted(() => {
					o = u(r), L(), m && w();
				}), e.onUnmounted(() => {
					o.disconnect();
				}), (l, a) => (e.openBlock(), e.createElementBlock("div", {
					ref_key: "infiniteLoading",
					ref: c
				}, [
					d.value == "loading" ? e.renderSlot(l.$slots, "spinner", { key: 0 }, () => [e.createVNode(S)], !0) : e.createCommentVNode("v-if", !0),
					d.value == "complete" ? e.renderSlot(l.$slots, "complete", { key: 1 }, () => {
						var p;
						return [e.createElementVNode("span", null, e.toDisplayString(((p = t.slots) == null ? void 0 : p.complete) || "No more results!"), 1)];
					}, !0) : e.createCommentVNode("v-if", !0),
					d.value == "error" ? e.renderSlot(l.$slots, "error", {
						key: 2,
						retry: r.emit
					}, () => {
						var p;
						return [e.createElementVNode("span", k, [e.createElementVNode("span", null, e.toDisplayString(((p = t.slots) == null ? void 0 : p.error) || "Oops something went wrong!"), 1), e.createElementVNode("button", {
							class: "retry",
							onClick: a[0] || (a[0] = (...$) => r.emit && r.emit(...$))
						}, " retry ")])];
					}, !0) : e.createCommentVNode("v-if", !0)
				], 512));
			}
		}, [["__scopeId", "data-v-9d82030b"], ["__file", "/home/oumoussa/side-projects/infinite/src/components/InfiniteLoading.vue"]]), Object.defineProperties(s, {
			__esModule: { value: !0 },
			[Symbol.toStringTag]: { value: "Module" }
		});
	});
}));
//#endregion
//#region src/features/settings/sso/components/AuthenticationBackLink.vue?vue&type=script&setup=true&lang.ts
var import_humanize_duration = /* @__PURE__ */ __toESM(require_humanize_duration(), 1);
var import_v3_infinite_loading_umd = /* @__PURE__ */ __toESM(require_v3_infinite_loading_umd(), 1);
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AuthenticationBackLink_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AuthenticationBackLink",
	setup(__props) {
		const i18n = useI18n();
		const router = useRouter();
		async function goBack() {
			await router.push({ name: VIEWS.AUTHENTICATION_SETTINGS });
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.backRow) }, [createVNode(unref(N8nButton_default), {
				variant: "ghost",
				size: "small",
				class: normalizeClass(_ctx.$style.backButton),
				"data-test-id": "settings-authentication-back",
				onClick: goBack
			}, {
				icon: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "arrow-left" })]),
				default: withCtx(() => [createTextVNode(" " + toDisplayString(unref(i18n).baseText("settings.authentication.back")), 1)]),
				_: 1
			}, 8, ["class"])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	backRow: "_backRow_icycf_1",
	backButton: "_backButton_icycf_6"
} }]]);
//#endregion
//#region src/features/settings/sso/views/SettingsLdapView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { key: 0 };
var _hoisted_2 = { key: 1 };
var _hoisted_3 = { key: 0 };
var SettingsLdapView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SettingsLdapView",
	setup(__props) {
		const toast = useToast();
		const i18n = useI18n();
		const message = useMessage();
		const documentTitle = useDocumentTitle();
		const pageRedirectionHelper = usePageRedirectionHelper();
		const settingsStore = useSettingsStore();
		const ssoStore = useSSOStore();
		const dataTable = ref([]);
		const tableKey = ref(0);
		const adConfig = ref();
		const loadingTestConnection = ref(false);
		const loadingDryRun = ref(false);
		const loadingLiveRun = ref(false);
		const loadingTable = ref(false);
		const hasAnyChanges = ref(false);
		const formInputs = ref(null);
		const formBus = createFormEventBus();
		const readyToSubmit = ref(false);
		const page = ref(0);
		const loginEnabled = ref(false);
		const syncEnabled = ref(false);
		const ldapConfigFormRef = ref();
		const isLDAPFeatureEnabled = computed(() => settingsStore.settings.enterprise.ldap);
		const goToUpgrade = async () => await pageRedirectionHelper.goToUpgrade("ldap", "upgrade-ldap");
		const cellClassStyle = ({ row, column }) => {
			if (column.property === "status") {
				if (row.status === "Success") return { color: "green" };
				else if (row.status === "Error") return { color: "red" };
			}
			if (column.property === "runMode") {
				if (row.runMode === "Dry") return { color: "orange" };
				else if (row.runMode === "Live") return { color: "blue" };
			}
			return {};
		};
		const onInput = (input) => {
			if (input.name === "loginEnabled" && typeof input.value === "boolean") loginEnabled.value = input.value;
			if (input.name === "synchronizationEnabled" && typeof input.value === "boolean") syncEnabled.value = input.value;
			hasAnyChanges.value = true;
		};
		const onReadyToSubmit = (ready) => {
			readyToSubmit.value = ready;
		};
		const syncDataMapper = (sync) => {
			const startedAt = new Date(sync.startedAt);
			const endedAt = new Date(sync.endedAt);
			const runTimeInMinutes = endedAt.getTime() - startedAt.getTime();
			return {
				runTime: (0, import_humanize_duration.default)(runTimeInMinutes),
				runMode: capitalizeFirstLetter(sync.runMode),
				status: capitalizeFirstLetter(sync.status),
				endedAt: convertToDisplayDate(endedAt.getTime()),
				details: i18n.baseText("settings.ldap.usersScanned", { interpolate: { scanned: sync.scanned.toString() } })
			};
		};
		const onSubmit = async () => {
			if (!hasAnyChanges.value || !ldapConfigFormRef.value) return;
			const formValues = ldapConfigFormRef.value.getValues();
			const newConfiguration = {
				loginEnabled: formValues.loginEnabled,
				loginLabel: formValues.loginLabel,
				connectionUrl: formValues.serverAddress,
				allowUnauthorizedCerts: formValues.allowUnauthorizedCerts,
				connectionPort: +formValues.port,
				connectionSecurity: formValues.connectionSecurity,
				baseDn: formValues.baseDn,
				bindingAdminDn: formValues.bindingType === "admin" ? formValues.adminDn : "",
				bindingAdminPassword: formValues.bindingType === "admin" ? formValues.adminPassword : "",
				emailAttribute: formValues.email,
				firstNameAttribute: formValues.firstName,
				lastNameAttribute: formValues.lastName,
				loginIdAttribute: formValues.loginId,
				ldapIdAttribute: formValues.ldapId,
				userFilter: formValues.userFilter,
				synchronizationEnabled: formValues.synchronizationEnabled,
				synchronizationInterval: +formValues.synchronizationInterval,
				searchPageSize: +formValues.pageSize,
				searchTimeout: +formValues.searchTimeout,
				enforceEmailUniqueness: formValues.enforceEmailUniqueness,
				linkExistingAccountsByEmail: formValues.linkExistingAccountsByEmail
			};
			let saveForm = true;
			if (!adConfig.value) return;
			try {
				if (adConfig.value.loginEnabled && !newConfiguration.loginEnabled) saveForm = await message.confirm(i18n.baseText("settings.ldap.confirmMessage.beforeSaveForm.message"), i18n.baseText("settings.ldap.confirmMessage.beforeSaveForm.headline"), {
					cancelButtonText: i18n.baseText("settings.ldap.confirmMessage.beforeSaveForm.cancelButtonText"),
					confirmButtonText: i18n.baseText("settings.ldap.confirmMessage.beforeSaveForm.confirmButtonText")
				}) === MODAL_CONFIRM;
				if (!saveForm) hasAnyChanges.value = true;
				adConfig.value = await ssoStore.updateLdapConfig(newConfiguration);
				toast.showToast({
					title: i18n.baseText("settings.ldap.updateConfiguration"),
					message: "",
					type: "success"
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.ldap.configurationError"));
			} finally {
				if (saveForm) hasAnyChanges.value = false;
			}
		};
		const onSaveClick = () => {
			formBus.emit("submit");
		};
		const onTestConnectionClick = async () => {
			loadingTestConnection.value = true;
			try {
				await ssoStore.testLdapConnection();
				toast.showToast({
					title: i18n.baseText("settings.ldap.connectionTest"),
					message: i18n.baseText("settings.ldap.toast.connection.success"),
					type: "success"
				});
			} catch (error) {
				toast.showToast({
					title: i18n.baseText("settings.ldap.connectionTestError"),
					message: error.message,
					type: "error"
				});
			} finally {
				loadingTestConnection.value = false;
			}
		};
		const onDryRunClick = async () => {
			loadingDryRun.value = true;
			try {
				await ssoStore.runLdapSync({ type: "dry" });
				toast.showToast({
					title: i18n.baseText("settings.ldap.runSync.title"),
					message: i18n.baseText("settings.ldap.toast.sync.success"),
					type: "success"
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.ldap.synchronizationError"));
			} finally {
				loadingDryRun.value = false;
				await reloadLdapSynchronizations();
			}
		};
		const onLiveRunClick = async () => {
			loadingLiveRun.value = true;
			try {
				await ssoStore.runLdapSync({ type: "live" });
				toast.showToast({
					title: i18n.baseText("settings.ldap.runSync.title"),
					message: i18n.baseText("settings.ldap.toast.sync.success"),
					type: "success"
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.ldap.synchronizationError"));
			} finally {
				loadingLiveRun.value = false;
				await reloadLdapSynchronizations();
			}
		};
		const getLdapConfig = async () => {
			try {
				adConfig.value = await ssoStore.getLdapConfig();
				loginEnabled.value = adConfig.value.loginEnabled;
				syncEnabled.value = adConfig.value.synchronizationEnabled;
				const whenLoginEnabled = (values) => values.loginEnabled === true;
				const whenSyncAndLoginEnabled = (values) => values.synchronizationEnabled === true && values.loginEnabled === true;
				const whenAdminBindingAndLoginEnabled = (values) => values.bindingType === "admin" && values.loginEnabled === true;
				formInputs.value = [
					{
						name: "loginEnabled",
						initialValue: adConfig.value.loginEnabled,
						properties: {
							type: "toggle",
							label: i18n.baseText("settings.ldap.form.loginEnabled.label"),
							tooltipText: i18n.baseText("settings.ldap.form.loginEnabled.tooltip"),
							required: true
						}
					},
					{
						name: "loginLabel",
						initialValue: adConfig.value.loginLabel,
						properties: {
							label: i18n.baseText("settings.ldap.form.loginLabel.label"),
							required: true,
							placeholder: i18n.baseText("settings.ldap.form.loginLabel.placeholder"),
							infoText: i18n.baseText("settings.ldap.form.loginLabel.infoText")
						},
						shouldDisplay: whenLoginEnabled
					},
					{
						name: "serverAddress",
						initialValue: adConfig.value.connectionUrl,
						properties: {
							label: i18n.baseText("settings.ldap.form.serverAddress.label"),
							required: true,
							capitalize: true,
							placeholder: i18n.baseText("settings.ldap.form.serverAddress.placeholder"),
							infoText: i18n.baseText("settings.ldap.form.serverAddress.infoText")
						},
						shouldDisplay: whenLoginEnabled
					},
					{
						name: "port",
						initialValue: adConfig.value.connectionPort,
						properties: {
							type: "number",
							label: i18n.baseText("settings.ldap.form.port.label"),
							capitalize: true,
							infoText: i18n.baseText("settings.ldap.form.port.infoText")
						},
						shouldDisplay: whenLoginEnabled
					},
					{
						name: "connectionSecurity",
						initialValue: adConfig.value.connectionSecurity,
						properties: {
							type: "select",
							label: i18n.baseText("settings.ldap.form.connectionSecurity.label"),
							infoText: i18n.baseText("settings.ldap.form.connectionSecurity.infoText"),
							options: [
								{
									label: "None",
									value: "none"
								},
								{
									label: "TLS",
									value: "tls"
								},
								{
									label: "STARTTLS",
									value: "startTls"
								}
							],
							required: true,
							capitalize: true
						},
						shouldDisplay: whenLoginEnabled
					},
					{
						name: "allowUnauthorizedCerts",
						initialValue: adConfig.value.allowUnauthorizedCerts,
						properties: {
							type: "toggle",
							label: i18n.baseText("settings.ldap.form.allowUnauthorizedCerts.label"),
							required: false
						},
						shouldDisplay(values) {
							return values.connectionSecurity !== "none" && values.loginEnabled === true;
						}
					},
					{
						name: "baseDn",
						initialValue: adConfig.value.baseDn,
						properties: {
							label: i18n.baseText("settings.ldap.form.baseDn.label"),
							required: true,
							capitalize: true,
							placeholder: i18n.baseText("settings.ldap.form.baseDn.placeholder"),
							infoText: i18n.baseText("settings.ldap.form.baseDn.infoText")
						},
						shouldDisplay: whenLoginEnabled
					},
					{
						name: "bindingType",
						initialValue: "admin",
						properties: {
							type: "select",
							label: i18n.baseText("settings.ldap.form.bindingType.label"),
							infoText: i18n.baseText("settings.ldap.form.bindingType.infoText"),
							options: [{
								value: "admin",
								label: "Admin"
							}, {
								value: "anonymous",
								label: "Anonymous"
							}]
						},
						shouldDisplay: whenLoginEnabled
					},
					{
						name: "adminDn",
						initialValue: adConfig.value.bindingAdminDn,
						properties: {
							label: i18n.baseText("settings.ldap.form.adminDn.label"),
							placeholder: i18n.baseText("settings.ldap.form.adminDn.placeholder"),
							infoText: i18n.baseText("settings.ldap.form.adminDn.infoText"),
							capitalize: true
						},
						shouldDisplay: whenAdminBindingAndLoginEnabled
					},
					{
						name: "adminPassword",
						initialValue: adConfig.value.bindingAdminPassword,
						properties: {
							label: i18n.baseText("settings.ldap.form.adminPassword.label"),
							type: "password",
							capitalize: true,
							infoText: i18n.baseText("settings.ldap.form.adminPassword.infoText")
						},
						shouldDisplay: whenAdminBindingAndLoginEnabled
					},
					{
						name: "userFilter",
						initialValue: adConfig.value.userFilter,
						properties: {
							label: i18n.baseText("settings.ldap.form.userFilter.label"),
							type: "text",
							required: false,
							capitalize: true,
							placeholder: i18n.baseText("settings.ldap.form.userFilter.placeholder"),
							infoText: i18n.baseText("settings.ldap.form.userFilter.infoText")
						},
						shouldDisplay: whenLoginEnabled
					},
					{
						name: "attributeMappingInfo",
						properties: {
							label: i18n.baseText("settings.ldap.form.attributeMappingInfo.label"),
							type: "info",
							labelSize: "large",
							labelAlignment: "left"
						},
						shouldDisplay: whenLoginEnabled
					},
					{
						name: "ldapId",
						initialValue: adConfig.value.ldapIdAttribute,
						properties: {
							label: i18n.baseText("settings.ldap.form.ldapId.label"),
							type: "text",
							required: true,
							capitalize: true,
							placeholder: i18n.baseText("settings.ldap.form.ldapId.placeholder"),
							infoText: i18n.baseText("settings.ldap.form.ldapId.infoText")
						},
						shouldDisplay: whenLoginEnabled
					},
					{
						name: "loginId",
						initialValue: adConfig.value.loginIdAttribute,
						properties: {
							label: i18n.baseText("settings.ldap.form.loginId.label"),
							type: "text",
							autocomplete: "email",
							required: true,
							capitalize: true,
							placeholder: i18n.baseText("settings.ldap.form.loginId.placeholder"),
							infoText: i18n.baseText("settings.ldap.form.loginId.infoText")
						},
						shouldDisplay: whenLoginEnabled
					},
					{
						name: "email",
						initialValue: adConfig.value.emailAttribute,
						properties: {
							label: i18n.baseText("settings.ldap.form.email.label"),
							type: "text",
							autocomplete: "email",
							required: true,
							capitalize: true,
							placeholder: i18n.baseText("settings.ldap.form.email.placeholder"),
							infoText: i18n.baseText("settings.ldap.form.email.infoText")
						},
						shouldDisplay: whenLoginEnabled
					},
					{
						name: "firstName",
						initialValue: adConfig.value.firstNameAttribute,
						properties: {
							label: i18n.baseText("settings.ldap.form.firstName.label"),
							type: "text",
							autocomplete: "email",
							required: true,
							capitalize: true,
							placeholder: i18n.baseText("settings.ldap.form.firstName.placeholder"),
							infoText: i18n.baseText("settings.ldap.form.firstName.infoText")
						},
						shouldDisplay: whenLoginEnabled
					},
					{
						name: "lastName",
						initialValue: adConfig.value.lastNameAttribute,
						properties: {
							label: i18n.baseText("settings.ldap.form.lastName.label"),
							type: "text",
							autocomplete: "email",
							required: true,
							capitalize: true,
							placeholder: i18n.baseText("settings.ldap.form.lastName.placeholder"),
							infoText: i18n.baseText("settings.ldap.form.lastName.infoText")
						},
						shouldDisplay: whenLoginEnabled
					},
					{
						name: "synchronizationEnabled",
						initialValue: adConfig.value.synchronizationEnabled,
						properties: {
							type: "toggle",
							label: i18n.baseText("settings.ldap.form.synchronizationEnabled.label"),
							tooltipText: i18n.baseText("settings.ldap.form.synchronizationEnabled.tooltip"),
							required: true
						},
						shouldDisplay: whenLoginEnabled
					},
					{
						name: "synchronizationInterval",
						initialValue: adConfig.value.synchronizationInterval,
						properties: {
							type: "number",
							label: i18n.baseText("settings.ldap.form.synchronizationInterval.label"),
							infoText: i18n.baseText("settings.ldap.form.synchronizationInterval.infoText")
						},
						shouldDisplay: whenSyncAndLoginEnabled
					},
					{
						name: "pageSize",
						initialValue: adConfig.value.searchPageSize,
						properties: {
							type: "number",
							label: i18n.baseText("settings.ldap.form.pageSize.label"),
							infoText: i18n.baseText("settings.ldap.form.pageSize.infoText")
						},
						shouldDisplay: whenSyncAndLoginEnabled
					},
					{
						name: "searchTimeout",
						initialValue: adConfig.value.searchTimeout,
						properties: {
							type: "number",
							label: i18n.baseText("settings.ldap.form.searchTimeout.label"),
							infoText: i18n.baseText("settings.ldap.form.searchTimeout.infoText")
						},
						shouldDisplay: whenSyncAndLoginEnabled
					},
					{
						name: "enforceEmailUniqueness",
						initialValue: adConfig.value.enforceEmailUniqueness,
						properties: {
							type: "toggle",
							label: i18n.baseText("settings.ldap.form.enforceEmailUniqueness.label"),
							tooltipText: i18n.baseText("settings.ldap.form.enforceEmailUniqueness.tooltip"),
							required: false
						},
						shouldDisplay: whenLoginEnabled
					},
					{
						name: "linkExistingAccountsByEmail",
						initialValue: adConfig.value.linkExistingAccountsByEmail,
						properties: {
							type: "toggle",
							label: i18n.baseText("settings.ldap.form.linkExistingAccountsByEmail.label"),
							tooltipText: i18n.baseText("settings.ldap.form.linkExistingAccountsByEmail.tooltip"),
							required: false
						},
						shouldDisplay: whenLoginEnabled
					}
				];
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.ldap.configurationError"));
			}
		};
		const loadSyncPage = async () => {
			try {
				loadingTable.value = true;
				const data = await ssoStore.getLdapSynchronizations({ page: page.value });
				if (data.length !== 0) {
					dataTable.value.push(...data.map(syncDataMapper));
					page.value += 1;
					return true;
				}
				return false;
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.ldap.synchronizationError"));
				return false;
			} finally {
				loadingTable.value = false;
			}
		};
		const getLdapSynchronizations = async (state) => {
			if (await loadSyncPage()) state.loaded();
			else state.complete();
		};
		const reloadLdapSynchronizations = async () => {
			try {
				page.value = 0;
				tableKey.value += 1;
				dataTable.value = [];
				await loadSyncPage();
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.ldap.synchronizationError"));
			}
		};
		onMounted(async () => {
			documentTitle.set(i18n.baseText("settings.ldap"));
			if (!isLDAPFeatureEnabled.value) return;
			await getLdapConfig();
			if (loginEnabled.value) await loadSyncPage();
		});
		return (_ctx, _cache) => {
			const _directive_n8n_html = resolveDirective("n8n-html");
			const _directive_loading = resolveDirective("loading");
			return !isLDAPFeatureEnabled.value ? (openBlock(), createElementBlock("div", _hoisted_1, [
				createVNode(AuthenticationBackLink_default),
				createBaseVNode("div", { class: normalizeClass([_ctx.$style.header, "mb-2xl"]) }, [createVNode(unref(N8nHeading_default), { size: "2xlarge" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.ldap")), 1)]),
					_: 1
				})], 2),
				createVNode(unref(N8nInfoTip_default), {
					type: "note",
					theme: "info",
					"tooltip-placement": "right",
					class: "mb-l"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.ldap.note")), 1)]),
					_: 1
				}),
				createVNode(unref(N8nEmptyState_default), {
					description: unref(i18n).baseText("settings.ldap.disabled.description"),
					"button-text": unref(i18n).baseText("settings.ldap.disabled.buttonText"),
					"onClick:button": goToUpgrade
				}, {
					heading: withCtx(() => [createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("settings.ldap.disabled.title")), 1)]),
					_: 1
				}, 8, ["description", "button-text"])
			])) : (openBlock(), createElementBlock("div", _hoisted_2, [
				createVNode(AuthenticationBackLink_default),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.container) }, [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createVNode(unref(N8nHeading_default), { size: "2xlarge" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.ldap")), 1)]),
						_: 1
					})], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.docsInfoTip) }, [createVNode(unref(N8nInfoTip_default), {
						theme: "info",
						type: "note"
					}, {
						default: withCtx(() => [withDirectives(createBaseVNode("span", null, null, 512), [[_directive_n8n_html, unref(i18n).baseText("settings.ldap.infoTip")]])]),
						_: 1
					})], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.settingsForm) }, [formInputs.value ? (openBlock(), createBlock(unref(N8nFormInputs_default), {
						key: 0,
						ref_key: "ldapConfigFormRef",
						ref: ldapConfigFormRef,
						inputs: formInputs.value,
						"event-bus": unref(formBus),
						"column-view": true,
						"vertical-spacing": "l",
						onUpdate: onInput,
						onReady: onReadyToSubmit,
						onSubmit
					}, null, 8, ["inputs", "event-bus"])) : createCommentVNode("", true)], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.buttonContainer) }, [loginEnabled.value ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 0,
						label: loadingTestConnection.value ? unref(i18n).baseText("settings.ldap.testingConnection") : unref(i18n).baseText("settings.ldap.testConnection"),
						size: "large",
						class: "mr-s",
						disabled: hasAnyChanges.value || !readyToSubmit.value,
						loading: loadingTestConnection.value,
						onClick: onTestConnectionClick
					}, null, 8, [
						"label",
						"disabled",
						"loading"
					])) : createCommentVNode("", true), createVNode(unref(N8nButton_default), {
						label: unref(i18n).baseText("settings.ldap.save"),
						size: "large",
						disabled: !hasAnyChanges.value || !readyToSubmit.value,
						onClick: onSaveClick
					}, null, 8, ["label", "disabled"])], 2)
				], 2),
				loginEnabled.value ? (openBlock(), createElementBlock("div", _hoisted_3, [
					createVNode(unref(N8nHeading_default), {
						tag: "h1",
						class: "mb-xl mt-3xl",
						size: "medium"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.ldap.section.synchronization.title")), 1)]),
						_: 1
					}),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.syncTable) }, [withDirectives((openBlock(), createBlock(unref(ElTable), {
						key: tableKey.value,
						border: true,
						stripe: true,
						data: dataTable.value,
						"cell-style": cellClassStyle,
						style: { "width": "100%" },
						"max-height": "250"
					}, {
						empty: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.ldap.synchronizationTable.empty.message")), 1)]),
						append: withCtx(() => [createVNode(unref(import_v3_infinite_loading_umd.default), {
							target: ".el-table__body-wrapper",
							onInfinite: getLdapSynchronizations
						})]),
						default: withCtx(() => [
							createVNode(unref(ElTableColumn), {
								prop: "status",
								label: unref(i18n).baseText("settings.ldap.synchronizationTable.column.status")
							}, null, 8, ["label"]),
							createVNode(unref(ElTableColumn), {
								prop: "endedAt",
								label: unref(i18n).baseText("settings.ldap.synchronizationTable.column.endedAt")
							}, null, 8, ["label"]),
							createVNode(unref(ElTableColumn), {
								prop: "runMode",
								label: unref(i18n).baseText("settings.ldap.synchronizationTable.column.runMode")
							}, null, 8, ["label"]),
							createVNode(unref(ElTableColumn), {
								prop: "runTime",
								label: unref(i18n).baseText("settings.ldap.synchronizationTable.column.runTime")
							}, null, 8, ["label"]),
							createVNode(unref(ElTableColumn), {
								prop: "details",
								label: unref(i18n).baseText("settings.ldap.synchronizationTable.column.details")
							}, null, 8, ["label"])
						]),
						_: 1
					}, 8, ["data"])), [[_directive_loading, loadingTable.value]])], 2),
					createBaseVNode("div", { class: normalizeClass(["pb-3xl", _ctx.$style.buttonContainer]) }, [createVNode(unref(N8nButton_default), {
						variant: "outline",
						label: unref(i18n).baseText("settings.ldap.dryRun"),
						size: "large",
						class: "mr-s",
						disabled: hasAnyChanges.value || !readyToSubmit.value,
						loading: loadingDryRun.value,
						onClick: onDryRunClick
					}, null, 8, [
						"label",
						"disabled",
						"loading"
					]), createVNode(unref(N8nButton_default), {
						label: unref(i18n).baseText("settings.ldap.synchronizeNow"),
						size: "large",
						disabled: hasAnyChanges.value || !readyToSubmit.value,
						loading: loadingLiveRun.value,
						onClick: onLiveRunClick
					}, null, 8, [
						"label",
						"disabled",
						"loading"
					])], 2)
				])) : createCommentVNode("", true)
			]));
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_2gzn2_1",
	syncTable: "_syncTable_2gzn2_5",
	header: "_header_2gzn2_9",
	enableFeatureContainer: "_enableFeatureContainer_2gzn2_18",
	sectionHeader: "_sectionHeader_2gzn2_30",
	settingsForm: "_settingsForm_2gzn2_34",
	docsInfoTip: "_docsInfoTip_2gzn2_38",
	buttonContainer: "_buttonContainer_2gzn2_42"
} }]]);
//#endregion
export { SettingsLdapView_default as default };
