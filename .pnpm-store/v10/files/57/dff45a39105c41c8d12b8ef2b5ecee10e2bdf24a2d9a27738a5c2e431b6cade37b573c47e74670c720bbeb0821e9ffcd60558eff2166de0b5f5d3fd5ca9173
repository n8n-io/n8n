import type { IIconService } from '../agStack/interfaces/iIconService';
import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { AgColumn } from '../entities/agColumn';
import type { IconName } from '../utils/icon';
export declare class IconService extends BeanStub implements NamedBean, IIconService<IconName, {
    column?: AgColumn | null;
}> {
    beanName: "iconSvc";
    createIconNoSpan(iconName: IconName, params?: {
        column?: AgColumn<any> | null;
    }): Element | undefined;
}
