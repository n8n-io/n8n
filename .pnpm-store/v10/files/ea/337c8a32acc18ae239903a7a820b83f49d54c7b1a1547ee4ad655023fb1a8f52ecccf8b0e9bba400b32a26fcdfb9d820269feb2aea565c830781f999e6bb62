const defaultOptions = {
    maxLength: 200,
    // locale: "en-IN"
}
const localeMap = {
    "$":"en-US",
    "€":"de-DE",
    "£":"en-GB",
    "¥":"ja-JP",
    "₹":"en-IN",
}
const sign = "(?:-|\+)?";
const digitsAndSeparator = "(?:\d+|\d{1,3}(?:,\d{3})+)";
const decimalPart = "(?:\.\d{1,2})?";
const symbol = "(?:\$|€|¥|₹)?";

const currencyCheckRegex = /^\s*(?:-|\+)?(?:\d+|\d{1,3}(?:,\d{3})+)?(?:\.\d{1,2})?\s*(?:\$|€|¥|₹)?\s*$/u;

export default class CurrencyParser{
    constructor(options){
        this.options = options || defaultOptions;
    }
    parse(val){
        if (typeof val === 'string' && val.length <= this.options.maxLength) {
            if(val.indexOf(",,") !== -1 && val.indexOf(".." !== -1)){
                const match = val.match(currencyCheckRegex);
                if(match){
                    const locale = this.options.locale || localeMap[match[2]||match[5]||"₹"];
                    const formatter = new Intl.NumberFormat(locale)
                    val = val.replace(/[^0-9,.]/g, '').trim();
                    val = Number(val.replace(formatter.format(1000)[1], ''));
                }
            }
        }
        return val;
    }
}
CurrencyParser.defaultOptions = defaultOptions;
