import React from 'react';
import { Styled } from '../constructors/constructWithOptions';
import css from '../constructors/css';
import withTheme from '../hoc/withTheme';
import ThemeProvider, { ThemeConsumer, ThemeContext, useTheme } from '../models/ThemeProvider';
import { NativeTarget, RuleSet } from '../types';
import isStyledComponent from '../utils/isStyledComponent';
declare const reactNative: Awaited<typeof import("react-native")>;
declare const baseStyled: <Target extends NativeTarget>(tag: Target) => Styled<"native", Target, Target extends import("../types").KnownTarget ? React.ComponentPropsWithRef<Target> : import("../types").BaseObject, import("../types").BaseObject>;
declare const aliases: readonly ["ActivityIndicator", "Button", "DatePickerIOS", "DrawerLayoutAndroid", "FlatList", "Image", "ImageBackground", "KeyboardAvoidingView", "Modal", "Pressable", "ProgressBarAndroid", "ProgressViewIOS", "RefreshControl", "SafeAreaView", "ScrollView", "SectionList", "Slider", "Switch", "Text", "TextInput", "TouchableHighlight", "TouchableOpacity", "View", "VirtualizedList"];
type KnownComponents = (typeof aliases)[number];
/** Isolates RN-provided components since they don't expose a helper type for this. */
type RNComponents = {
    [K in keyof typeof reactNative]: (typeof reactNative)[K] extends React.ComponentType<any> ? (typeof reactNative)[K] : never;
};
declare const styled: typeof baseStyled & { [E in KnownComponents]: Styled<"native", RNComponents[E], React.ComponentProps<RNComponents[E]>>; };
declare const toStyleSheet: (rules: RuleSet<object>) => import("css-to-react-native").Style;
export { CSSKeyframes, CSSObject, CSSProperties, CSSPseudos, DefaultTheme, ExecutionContext, ExecutionProps, IStyledComponent, IStyledComponentFactory, IStyledStatics, NativeTarget, PolymorphicComponent, PolymorphicComponentProps, Runtime, StyledObject, StyledOptions, } from '../types';
export { css, styled as default, isStyledComponent, styled, ThemeConsumer, ThemeContext, ThemeProvider, toStyleSheet, useTheme, withTheme, };
