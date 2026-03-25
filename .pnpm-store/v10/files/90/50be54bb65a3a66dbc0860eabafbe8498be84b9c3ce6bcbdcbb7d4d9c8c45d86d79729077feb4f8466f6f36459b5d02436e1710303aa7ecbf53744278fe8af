import * as React from 'react';
import type { IMenuItem, SearchResult } from '../../services/types';
import type { SearchStore } from '../../services/SearchStore';
import type { MarkerService } from '../../services/MarkerService';
import { MenuItem } from '../SideMenu/MenuItem';
import { OptionsContext } from '../OptionsProvider';
export interface SearchBoxProps {
    search: SearchStore<string>;
    marker: MarkerService;
    getItemById: (id: string) => IMenuItem | undefined;
    onActivate: (item: IMenuItem) => void;
    className?: string;
}
export interface SearchBoxState {
    results: SearchResult[];
    noResults: boolean;
    term: string;
    activeItemIdx: number;
}
export declare class SearchBox extends React.PureComponent<SearchBoxProps, SearchBoxState> {
    activeItemRef: MenuItem | null;
    static contextType: React.Context<import("../..").RedocNormalizedOptions>;
    context: React.ContextType<typeof OptionsContext>;
    constructor(props: any);
    clearResults(term: string): void;
    clear: () => void;
    handleKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    setResults(results: SearchResult[], term: string): void;
    searchCallback(searchTerm: string): void;
    search: (event: React.ChangeEvent<HTMLInputElement>) => void;
    render(): React.JSX.Element;
}
