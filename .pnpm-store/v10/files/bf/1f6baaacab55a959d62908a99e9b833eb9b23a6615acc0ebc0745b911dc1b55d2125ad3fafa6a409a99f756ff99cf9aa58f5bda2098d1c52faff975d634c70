import type { FloatingFilterInputService } from '../../floating/provided/iFloatingFilterInputService';
import { TextInputFloatingFilter } from '../../floating/provided/textInputFloatingFilter';
import type { ITextFloatingFilterParams, TextFilterModel } from './iTextFilter';
import { TextFilterModelFormatter } from './textFilterModelFormatter';
export declare class TextFloatingFilter extends TextInputFloatingFilter<ITextFloatingFilterParams, TextFilterModel> {
    protected readonly FilterModelFormatterClass: typeof TextFilterModelFormatter;
    protected readonly filterType = "text";
    protected readonly defaultOptions: import("../iSimpleFilter").ISimpleFilterModelType[];
    protected createFloatingFilterInputService(): FloatingFilterInputService;
}
