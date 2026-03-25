import type { Node } from '@markdoc/markdoc/dist/src/types';
import type { LayoutVariant, REDOCLY_ROUTE_RBAC, REDOCLY_TEAMS_RBAC } from '../constants';
import type { ProductConfig, ProductGoogleAnalyticsConfig, RbacScopeItems, RedoclyConfig, SeoConfig } from './config-types';
export * from './code-walkthrough-types';
export type UiAccessibleConfig = Pick<RedoclyConfig, 'logo' | 'navbar' | 'products' | 'footer' | 'sidebar' | 'scripts' | 'links' | 'feedback' | 'search' | 'colorMode' | 'navigation' | 'codeSnippet' | 'markdown' | 'openapi' | 'graphql' | 'analytics' | 'userMenu' | 'versionPicker' | 'breadcrumbs' | 'catalog' | 'scorecard'> & {
    auth?: {
        idpsInfo?: {
            idpId: string;
            type: string;
            title: string | undefined;
        }[];
        devLogin?: boolean;
        loginUrls?: Record<string, string>;
    };
    breadcrumbs?: {
        prefixItems?: ResolvedNavLinkItem[];
    };
    products?: {
        [key: string]: ProductUiConfig;
    };
};
/**
 * @deprecated left for backwards compatibility. To be removed in Realm 1.0
 */
export type ThemeUIConfig = UiAccessibleConfig;
export type ResolvedNavLinkItem = {
    type: 'link';
    fsPath?: string;
    metadata?: Record<string, unknown>;
    link: string;
    label: string;
    labelTranslationKey?: string;
    items?: ResolvedNavItem[];
    sidebar?: ResolvedNavItem[];
    external?: boolean;
    target?: '_self' | '_blank';
    version?: string;
    isDefault?: boolean;
    versionFolderId?: string;
    badges?: ItemBadge[];
    httpVerb?: string;
    separatorLine?: boolean;
    linePosition?: 'top' | 'bottom';
    routeSlug?: string;
    active?: boolean;
    deprecated?: boolean;
    icon?: string;
    srcSet?: string;
    [REDOCLY_TEAMS_RBAC]?: RbacScopeItems;
    [REDOCLY_ROUTE_RBAC]?: {
        slug?: string;
        fsPath?: string;
    };
    linkedSidebars?: string[];
    languageInsensitive?: boolean;
};
export type ItemBadge = {
    name: string;
    color?: string;
    position?: 'before' | 'after';
};
export type ResolvedNavGroupItem = {
    type: 'group';
    fsPath?: string;
    metadata?: Record<string, unknown>;
    link?: string;
    label?: string;
    labelTranslationKey?: string;
    items?: ResolvedNavItem[];
    sidebar?: ResolvedNavItem[];
    external?: boolean;
    target?: '_self' | '_blank';
    expanded?: string;
    selectFirstItemOnExpand?: boolean;
    version?: string;
    isDefault?: boolean;
    versionFolderId?: string;
    menuStyle?: MenuStyle;
    separatorLine?: boolean;
    linePosition?: 'top' | 'bottom';
    routeSlug?: string;
    active?: boolean;
    icon?: string;
    srcSet?: string;
    [REDOCLY_TEAMS_RBAC]?: RbacScopeItems;
    [REDOCLY_ROUTE_RBAC]?: {
        slug?: string;
        fsPath?: string;
    };
    linkedSidebars?: string[];
    languageInsensitive?: boolean;
};
export type ResolvedNavItem = ResolvedNavLinkItem | ResolvedNavGroupItem | {
    type: 'separator';
    fsPath?: never;
    metadata?: Record<string, unknown>;
    label?: string;
    labelTranslationKey?: string;
    routeSlug?: never;
    version?: string;
    isDefault?: boolean;
    versionFolderId?: string;
    variant?: 'primary' | 'secondary';
    separatorLine?: boolean;
    linePosition?: 'top' | 'bottom';
    link?: undefined;
    items?: ResolvedNavItem[];
    sidebar?: ResolvedNavItem[];
    linkedSidebars?: string[];
    icon?: string;
    srcSet?: string;
    languageInsensitive?: boolean;
    [REDOCLY_TEAMS_RBAC]?: RbacScopeItems;
    [REDOCLY_ROUTE_RBAC]?: {
        slug?: string;
        fsPath?: string;
    };
} | {
    type: 'error';
    fsPath?: never;
    version?: string;
    isDefault?: boolean;
    versionFolderId?: string;
    metadata?: Record<string, unknown>;
    routeSlug?: never;
    label: string;
    labelTranslationKey?: string;
    link?: undefined;
    items?: ResolvedNavItem[];
    sidebar?: ResolvedNavItem[];
    linkedSidebars?: string[];
    icon?: string;
    srcSet?: string;
    languageInsensitive?: boolean;
    [REDOCLY_TEAMS_RBAC]?: RbacScopeItems;
    [REDOCLY_ROUTE_RBAC]?: {
        slug?: string;
        fsPath?: string;
    };
};
export type ResolvedNavItemWithLink = (ResolvedNavLinkItem | ResolvedNavGroupItem) & {
    link: string;
};
export type ResolvedSidebar = {
    relatedNavbarItem?: BreadcrumbItem;
    items: ResolvedNavItem[];
};
export type CompilationError = {
    message: string;
    sourceFileRelativePath: string;
    sourceFileLocation: {
        line: number;
        character?: number;
    };
    codeframe: string;
};
export type PageProps = {
    metadata?: Record<string, unknown>;
    seo?: SeoConfig;
    frontmatter?: Omit<PageProps, 'frontmatter'> & {
        settings?: any;
    } & Partial<UiAccessibleConfig>;
    disableAutoScroll?: boolean;
    lastModified?: string | null;
    [k: string]: unknown;
    dynamicMarkdocComponents?: string[];
    compilationErrors?: CompilationError[];
    markdown?: MdOptions;
    openapiOptions?: OpenAPIOptions;
    definitionId?: string;
    variables?: {
        lang?: string;
        rbac?: {
            teams: string[];
        };
    };
};
export interface MdOptions {
    partials: Record<string, Node>;
    variables?: Record<string, any>;
}
export interface PageStaticData {
    props?: PageProps;
    [k: string]: unknown;
}
export type UserData = {
    isAuthenticated: boolean;
    id?: string;
    sub?: string;
    name: string;
    email?: string;
    picture: string;
    logoutDisabled?: boolean;
    teams?: string[];
};
export interface PageData {
    templateId: string;
    redirectTo?: string;
    slug: string;
    sharedDataIds: Record<string, string>;
    props: PageProps;
    versions?: Version[];
    userData: UserData;
}
export type NavItem = {
    page?: string;
    directory?: string;
    group?: string;
    groupTranslationKey?: string;
    label?: string;
    labelTranslationKey?: string;
    href?: string;
    items?: NavItem[];
    separator?: string;
    separatorTranslationKey?: string;
    separatorLine?: boolean;
    linePosition?: 'top' | 'bottom';
    version?: string;
    menuStyle?: MenuStyle;
    external?: boolean;
    target?: '_self' | '_blank';
    expanded?: boolean | 'always';
    selectFirstItemOnExpand?: boolean;
    flatten?: boolean;
    icon?: string | {
        srcSet: string;
    };
    rbac?: RbacScopeItems;
    linkedSidebars?: string[];
    $ref?: string;
    disconnect?: boolean;
};
export interface LogoConfig {
    image?: string;
    srcSet?: string;
    altText?: string;
    link?: string;
    favicon?: string;
}
export type Version = {
    version: string;
    label: string;
    link: string;
    default: boolean;
    active: boolean;
    folderId: string;
    [REDOCLY_TEAMS_RBAC]?: RbacScopeItems;
    [REDOCLY_ROUTE_RBAC]?: {
        slug?: string;
        fsPath?: string;
    };
};
export type VersionConfigItem = {
    version: string;
    name?: string;
};
export type VersionsConfigType = {
    versions: VersionConfigItem[];
    default?: string;
};
export type VersionedFolderConfig = {
    versionedFiles: Map<string, Set<string>>;
    defaultVersion?: string;
    versions: VersionConfigItem[];
    hasVersionsConfig?: boolean;
};
export type NavGroup = ResolvedNavItem[] | undefined | string | boolean | number;
export type NavGroupRecord = Record<string, NavGroup>;
export type ResolvedConfigLinks = NavGroup | NavGroupRecord;
export type RawNavConfigItem = NavItem | NavItem[] | string | undefined | boolean | number;
export type RawNavConfig = RawNavConfigItem | Record<string, RawNavConfigItem>;
export type OpenAPIOptions = {
    showRightPanelToggle?: boolean;
    layout?: LayoutVariant;
    collapsedSidebar?: boolean;
};
export type MenuStyle = 'drilldown' | 'drilldown-header';
export type BreadcrumbItem = {
    label: string;
    link?: string;
};
export type ProductThemeOverrideConfig = Pick<RedoclyConfig, 'logo' | 'navbar' | 'footer' | 'sidebar' | 'search' | 'codeSnippet' | 'breadcrumbs' | 'feedback'> & {
    analytics?: {
        ga?: ProductGoogleAnalyticsConfig;
    };
};
export type ProductUiConfig = ProductConfig & {
    slug: string;
    link: string;
    [REDOCLY_TEAMS_RBAC]?: {
        [key: string]: string;
    };
    [REDOCLY_ROUTE_RBAC]?: {
        [key: string]: string;
    };
    configOverride?: ProductThemeOverrideConfig;
};
