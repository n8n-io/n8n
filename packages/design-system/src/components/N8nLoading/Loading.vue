<template>
	<el-skeleton :loading="loading" animated>
		<template slot="template">
			<el-skeleton-item v-if="variant === 'image'" :variant="variant" />
			<el-skeleton-item v-if="variant === 'button'" :variant="variant" />
			<div v-if="variant === 'h1'">
				<el-skeleton-item v-if="variant === 'h1'" :variant="variant" />
				<el-skeleton-item
					v-if="variant === 'h1'"
					:variant="variant"
					class="el-skeleton__h1--second"
				/>
			</div>
			<div v-if="variant === 'p'">
				<el-skeleton-item
					v-for="(item, index) in rows"
					:key="`${index}-${item}`"
					:class="{
						'el-skeleton__paragraph': item !== 1,
						'is-last': item === rows && rows > 1,
					}"
					:variant="variant"
				/>
			</div>
		</template>
	</el-skeleton>
</template>

<script lang="ts">
import ElSkeleton from 'element-ui/lib/skeleton';
import ElSkeletonItem from 'element-ui/lib/skeleton-item';

export default {
	name: 'n8n-loading',
	components: {
		ElSkeleton,
		ElSkeletonItem,
	},
	props: {
		animated: {
			type: Boolean,
		},
		loading: {
			type: Boolean,
		},
		rows: {
			type: Number,
		},
		variant: {
			type: String,
		},
	},
};
</script>
<style>
.el-skeleton {
	width: 100%;
}

.el-skeleton__item {
	background: #f2f2f2;
	display: inline-block;
	height: 16px;
	border-radius: 8px;
	width: 100%;
}

.el-skeleton__button {
	height: 40px;
	width: 124px;
	border-radius: 4px;
}
.el-skeleton__p {
	width: 100%;
}
.el-skeleton__p.is-last {
	width: 61%;
}
.el-skeleton__p.is-first {
	width: 33%;
}
.el-skeleton__text {
	width: 100%;
	height: 13px;
}
.el-skeleton__caption {
	height: 12px;
}

.el-skeleton__h1 {
	height: 20px;
}

.el-skeleton__image {
	width: unset;
	height: 607px !important;
	display: -webkit-box;
	display: -ms-flexbox;
	display: flex;
	-webkit-box-align: center;
	-ms-flex-align: center;
	align-items: center;
	-webkit-box-pack: center;
	-ms-flex-pack: center;
	justify-content: center;
	border-radius: 8px !important;
}

.el-skeleton__image svg {
	fill: #dcdde0;
	width: 22%;
	height: 22%;
}

@-webkit-keyframes el-skeleton-loading {
	0% {
		background-position: 100% 50%;
	}
	100% {
		background-position: 0 50%;
	}
}

@keyframes el-skeleton-loading {
	0% {
		background-position: 100% 50%;
	}
	100% {
		background-position: 0 50%;
	}
}

.el-skeleton__first-line,
.el-skeleton__paragraph {
	height: 16px;
	margin-top: 16px;
	background: #f2f2f2;
}
.el-skeleton.is-animated .el-skeleton__item {
	background: -webkit-gradient(
		linear,
		left top,
		right top,
		color-stop(25%, #f2f2f2),
		color-stop(37%, #e6e6e6),
		color-stop(63%, #f2f2f2)
	);
	background: linear-gradient(90deg, #f2f2f2 25%, #e6e6e6 37%, #f2f2f2 63%);
	background-size: 400% 100%;
	-webkit-animation: el-skeleton-loading 1.4s ease infinite;
	animation: el-skeleton-loading 1.4s ease infinite;
}
.el-skeleton__item {
	background: #f2f2f2;
	display: inline-block;
	height: 16px;
	border-radius: 8px;
	width: 100%;
}
.el-skeleton__circle {
	border-radius: 50%;
	width: 36px;
	height: 36px;
	line-height: 36px;
}
.el-skeleton__circle--lg {
	width: 40px;
	height: 40px;
	line-height: 40px;
}
.el-skeleton__circle--md {
	width: 28px;
	height: 28px;
	line-height: 28px;
}
.el-skeleton__button {
	height: 40px;
	width: 162px;
	border-radius: 20px;
}
.el-skeleton__p {
	width: 100%;
}
.el-skeleton__p.is-last {
	width: 61%;
}
.el-skeleton__p.is-first {
	width: 33%;
}
.el-skeleton__text {
	width: 100%;
	height: 13px;
}
.el-skeleton__caption {
	height: 12px;
}
.el-skeleton__h1 {
	height: 20px;
}

.el-skeleton__h1--second {
	width: 40%;
	margin-top: 14px;
}
.el-skeleton__h3 {
	height: 18px;
}
.el-skeleton__h5 {
	height: 16px;
}
.el-skeleton__image {
	width: unset;
	display: -webkit-box;
	display: -ms-flexbox;
	display: flex;
	-webkit-box-align: center;
	-ms-flex-align: center;
	align-items: center;
	-webkit-box-pack: center;
	-ms-flex-pack: center;
	justify-content: center;
	border-radius: 0;
}
.el-skeleton__image svg {
	fill: #dcdde0;
	width: 22%;
	height: 22%;
}
</style>
